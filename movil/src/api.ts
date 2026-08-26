import * as Crypto from "expo-crypto";
import * as Network from "expo-network";
import * as SecureStore from "expo-secure-store";
import {
  leerOperaciones,
  marcarEnviando,
  obtenerDispositivoId,
  registrarFalloTransporte,
  registrarResultados,
  verificarIntegridadOperaciones,
} from "./almacenLocal";
import { obtenerClaveIntegridad } from "./infraestructura/baseLocal";
import { hmacSha512 } from "./seguridad/integridadOffline";
import { notificarDatosMoviles } from "./eventosDatosMovil";
import { TAMANO_LOTE_SINCRONIZACION } from "./sincronizacion/lotes";

const base = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
const TIEMPO_LIMITE_MS = 25_000;
let secuenciaConsulta = 0;
const consultasRecientes = new Map<
  string,
  { secuencia: number; promesa: Promise<unknown> }
>();
const MAXIMO_CONSULTAS_RASTREADAS = 150;
let renovacionEnCurso: Promise<boolean> | null = null;

if (!__DEV__ && !base.startsWith("https://")) {
  throw new Error(
    "EXPO_PUBLIC_API_URL debe usar HTTPS en una compilación de producción.",
  );
}

export class ErrorApi extends Error {
  constructor(
    mensaje: string,
    public estado = 0,
  ) {
    super(mensaje);
  }
}

async function solicitar(url: string, opciones: RequestInit) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIEMPO_LIMITE_MS);
  try {
    return await fetch(url, { ...opciones, signal: controlador.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ErrorApi(
        "La conexión tardó demasiado. Tus datos siguen guardados en el equipo.",
      );
    }
    throw new ErrorApi(
      "No hay conexión con el servidor. Tus datos siguen guardados en el equipo.",
    );
  } finally {
    clearTimeout(temporizador);
  }
}

async function ejecutarSolicitud<T>(
  ruta: string,
  opciones: RequestInit = {},
  reintento = true,
): Promise<T> {
  const metodo = opciones.method?.toUpperCase() ?? "GET";
  const esConsulta = metodo === "GET" || metodo === "HEAD";
  const separador = ruta.includes("?") ? "&" : "?";
  const rutaFresca = esConsulta
    ? `${ruta}${separador}__nexo=${Date.now()}-${++secuenciaConsulta}`
    : ruta;
  const token = await SecureStore.getItemAsync("access_token");
  const respuesta = await solicitar(`${base}${rutaFresca}`, {
    ...opciones,
    headers: {
      ...(opciones.body ? { "Content-Type": "application/json" } : {}),
      ...(esConsulta
        ? { "Cache-Control": "no-cache", Pragma: "no-cache" }
        : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opciones.headers,
    },
  });
  if (respuesta.status === 401 && reintento && !ruta.startsWith("/auth/")) {
    const renovado = await renovar();
    if (renovado) return ejecutarSolicitud<T>(ruta, opciones, false);
  }
  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null);
    throw new ErrorApi(
      cuerpo?.error?.mensaje ?? "No se pudo completar la solicitud.",
      respuesta.status,
    );
  }
  const cuerpo =
    respuesta.status === 204
      ? (undefined as T)
      : ((await respuesta.json()) as T);
  if (!esConsulta && !ruta.startsWith("/auth/"))
    notificarDatosMoviles({ origen: "SERVIDOR", ruta });
  return cuerpo;
}

/** Cada lectura toca servidor y una respuesta antigua no puede pisar la nueva. */
export function api<T>(
  ruta: string,
  opciones: RequestInit = {},
  reintento = true,
): Promise<T> {
  const metodo = opciones.method?.toUpperCase() ?? "GET";
  if (metodo !== "GET" && metodo !== "HEAD")
    return ejecutarSolicitud<T>(ruta, opciones, reintento);

  const clave = `${metodo}:${ruta}`;
  const secuencia = ++secuenciaConsulta;
  const solicitud = ejecutarSolicitud<T>(ruta, opciones, reintento);
  const resultado = solicitud.then(
    (datos) => {
      const reciente = consultasRecientes.get(clave);
      return reciente && reciente.secuencia !== secuencia
        ? (reciente.promesa as Promise<T>)
        : datos;
    },
    (error) => {
      const reciente = consultasRecientes.get(clave);
      if (reciente && reciente.secuencia !== secuencia)
        return reciente.promesa as Promise<T>;
      throw error;
    },
  );
  consultasRecientes.set(clave, { secuencia, promesa: resultado });
  if (consultasRecientes.size > MAXIMO_CONSULTAS_RASTREADAS) {
    const masAntigua = consultasRecientes.keys().next().value;
    if (masAntigua) consultasRecientes.delete(masAntigua);
  }
  return resultado;
}

/**
 * Crea una fuente autenticada para imágenes privadas servidas por la API.
 * El token nunca se agrega a la URL ni queda en cachés o registros del servidor.
 */
export async function crearFuenteImagenApi(ruta: string) {
  const token = await SecureStore.getItemAsync("access_token");
  return {
    uri: `${base}${ruta}`,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  };
}

export async function guardarTokens(accessToken: string, refreshToken: string) {
  await Promise.all([
    SecureStore.setItemAsync("access_token", accessToken, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    }),
    SecureStore.setItemAsync("refresh_token", refreshToken, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    }),
  ]);
}

export async function limpiarTokens() {
  // La bitácora no se elimina al cerrar sesión: podría contener trabajo pendiente.
  await Promise.all([
    SecureStore.deleteItemAsync("access_token"),
    SecureStore.deleteItemAsync("refresh_token"),
  ]);
}

/** Registra la clave HMAC del equipo después de autenticar; nunca es la clave SQLCipher. */
export async function prepararIntegridadDispositivo() {
  const [dispositivoId, claveIntegridad] = await Promise.all([
    obtenerDispositivoId(),
    obtenerClaveIntegridad(),
  ]);
  return api<{
    dispositivoId: string;
    ultimaSecuencia: number;
    ultimoHash: string;
  }>("/sincronizacion/dispositivos/registrar", {
    method: "POST",
    body: JSON.stringify({ dispositivoId, claveIntegridad }),
  });
}

async function renovar() {
  if (renovacionEnCurso) return renovacionEnCurso;
  renovacionEnCurso = ejecutarRenovacion().finally(() => {
    renovacionEnCurso = null;
  });
  return renovacionEnCurso;
}

async function ejecutarRenovacion() {
  const [refreshToken, accessToken] = await Promise.all([
    SecureStore.getItemAsync("refresh_token"),
    SecureStore.getItemAsync("access_token"),
  ]);
  if (!refreshToken) return false;
  try {
    const respuesta = await solicitar(`${base}/auth/renovar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ refreshToken }),
    });
    if (!respuesta.ok) return false;
    const datos = await respuesta.json();
    await guardarTokens(datos.accessToken, datos.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export async function obtenerConectividad() {
  const estado = await Network.getNetworkStateAsync();
  return {
    conectada: Boolean(
      estado.isConnected && estado.isInternetReachable !== false,
    ),
    tipo: estado.type,
  };
}

interface ResultadoSincronizacion {
  idOperacion: string;
  exito: boolean;
  entidadId?: string;
  error?: string;
  codigoError?: string;
  rechazoPermanente?: boolean;
  idempotente?: boolean;
}

export async function sincronizarPendientes() {
  const integridad = await verificarIntegridadOperaciones();
  if (!integridad.valida) {
    throw new ErrorApi(
      `La bitácora local no superó la revisión de integridad (registro ${integridad.secuencia}). Contacta al administrador.`,
      409,
    );
  }

  const dispositivoId = await obtenerDispositivoId();
  const claveIntegridad = await obtenerClaveIntegridad();
  const resultados: ResultadoSincronizacion[] = [];

  // Se drena por prefijos de 100. Así 501+ operaciones nunca exceden el
  // contrato del servidor y cada respuesta queda confirmada antes de avanzar.
  while (true) {
    const operaciones = await leerOperaciones(TAMANO_LOTE_SINCRONIZACION);
    if (!operaciones.length) break;
    const ids = operaciones.map((operacion) => operacion.id);
    const huellaIntegridad = await hmacSha512(
      claveIntegridad,
      operaciones.map((operacion) => operacion.hashIntegridad).join("|"),
    );
    await marcarEnviando(ids);

    try {
      const respuesta = await api<{ resultados: ResultadoSincronizacion[] }>(
        "/sincronizacion/lotes",
        {
          method: "POST",
          body: JSON.stringify({
            idLoteCliente: crearIdLocal(),
            dispositivoId,
            huellaIntegridad,
            operaciones: operaciones.map((operacion) => ({
              idOperacion: operacion.id,
              tipo: operacion.tipo,
              datos: operacion.datos,
              visitaOperacionId: operacion.visitaOperacionId,
              secuencia: operacion.secuencia,
              hashAnterior: operacion.hashAnterior,
              creadoEn: operacion.creadoEn,
              hashIntegridad: operacion.hashIntegridad,
            })),
          }),
        },
      );
      await registrarResultados(respuesta.resultados);
      resultados.push(...respuesta.resultados);
    } catch (error) {
      const mensaje =
        error instanceof Error ? error.message : "No se pudo enviar el lote.";
      await registrarFalloTransporte(ids, mensaje);
      throw error;
    }
  }

  const exitosas = resultados.filter((resultado) => resultado.exito).length;
  return {
    exitosas,
    fallidas: resultados.length - exitosas,
    resultados,
  };
}

export function crearIdLocal() {
  return `op-${Crypto.randomUUID()}`;
}
