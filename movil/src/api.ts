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

const base = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
const TIEMPO_LIMITE_MS = 25_000;

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

export async function api<T>(
  ruta: string,
  opciones: RequestInit = {},
  reintento = true,
): Promise<T> {
  const token = await SecureStore.getItemAsync("access_token");
  const respuesta = await solicitar(`${base}${ruta}`, {
    ...opciones,
    headers: {
      ...(opciones.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opciones.headers,
    },
  });
  if (respuesta.status === 401 && reintento && !ruta.startsWith("/auth/")) {
    const renovado = await renovar();
    if (renovado) return api<T>(ruta, opciones, false);
  }
  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null);
    throw new ErrorApi(
      cuerpo?.error?.mensaje ?? "No se pudo completar la solicitud.",
      respuesta.status,
    );
  }
  if (respuesta.status === 204) return undefined as T;
  return respuesta.json();
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

  const operaciones = await leerOperaciones();
  if (!operaciones.length)
    return {
      exitosas: 0,
      fallidas: 0,
      resultados: [] as ResultadoSincronizacion[],
    };

  const ids = operaciones.map((operacion) => operacion.id);
  const dispositivoId = await obtenerDispositivoId();
  const claveIntegridad = await obtenerClaveIntegridad();
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
    const exitosas = respuesta.resultados.filter(
      (resultado) => resultado.exito,
    ).length;
    return {
      exitosas,
      fallidas: respuesta.resultados.length - exitosas,
      resultados: respuesta.resultados,
    };
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : "No se pudo enviar el lote.";
    await registrarFalloTransporte(ids, mensaje);
    throw error;
  }
}

export function crearIdLocal() {
  return `op-${Crypto.randomUUID()}`;
}
