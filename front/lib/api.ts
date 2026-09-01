import {
  notificarCambioDatos,
  notificarSesionInvalidada,
} from "./eventosDatos";
import { indicePracticasWeb } from "@/modulos/capacitacion/indicePracticasWeb";

const base = process.env.NEXT_PUBLIC_API_URL ?? "/api";
let secuenciaConsulta = 0;
const consultasRecientes = new Map<
  string,
  { secuencia: number; promesa: Promise<unknown> }
>();
const MAXIMO_CONSULTAS_RASTREADAS = 200;
let renovacionEnCurso: Promise<boolean> | null = null;
const controladoresActivos = new Set<AbortController>();
const TIEMPO_MAXIMO_PREDETERMINADO_MS = 45_000;
const TIEMPO_MAXIMO_RENOVACION_MS = 12_000;

const CLAVE_MUTACIONES_PRACTICA = "nexo:capacitacion:mutaciones-reales:v3";

export interface OpcionesApi extends RequestInit {
  tiempoMaximoMs?: number;
}

interface MutacionPracticaLocal {
  leccionId: string;
  metodo: string;
  ruta: string;
  cuerpo: Record<string, unknown>;
  registradaEn: string;
}

interface PracticaApiPermitida {
  mutaciones: readonly {
    metodo: "POST" | "PATCH" | "DELETE";
    patron: RegExp;
  }[];
}

/**
 * Lista mínima y auditable de escrituras que el entrenador puede simular.
 * Una query string por sí sola nunca activa la simulación: también se exige
 * el entrenador montado, la pantalla correcta y una mutación esperada.
 */
const practicasApiPermitidas: Readonly<Record<string, PracticaApiPermitida>> = {
  "clientes-alta": {
    mutaciones: [{ metodo: "POST", patron: /^\/clientes$/ }],
  },
  "clientes-edicion": {
    mutaciones: [{ metodo: "PATCH", patron: /^\/clientes\/[^/?]+$/ }],
  },
  "cobranza-abono": {
    mutaciones: [{ metodo: "POST", patron: /^\/abonos$/ }],
  },
  "compras-proveedor": {
    mutaciones: [{ metodo: "POST", patron: /^\/compras$/ }],
  },
  "compras-proveedores": {
    mutaciones: [{ metodo: "POST", patron: /^\/proveedores$/ }],
  },
  "configuracion-localidades": {
    mutaciones: [{ metodo: "POST", patron: /^\/localidades$/ }],
  },
  "cortes-liquidacion": {
    mutaciones: [{ metodo: "POST", patron: /^\/cortes$/ }],
  },
  "devoluciones-seguras": {
    mutaciones: [{ metodo: "POST", patron: /^\/devoluciones$/ }],
  },
  "importacion-inicial": {
    mutaciones: [{ metodo: "POST", patron: /^\/importaciones\/excel$/ }],
  },
  "inventario-producto": {
    mutaciones: [{ metodo: "POST", patron: /^\/inventario\/productos$/ }],
  },
  "pedido-asignar-proveedor": {
    mutaciones: [{ metodo: "PATCH", patron: /^\/pedidos\/[^/?]+\/estado$/ }],
  },
  "pedido-crear": {
    mutaciones: [{ metodo: "POST", patron: /^\/pedidos$/ }],
  },
  "pedido-entregar": {
    mutaciones: [{ metodo: "POST", patron: /^\/pedidos\/[^/?]+\/entregar$/ }],
  },
  "pedido-recibir-preparar": {
    mutaciones: [{ metodo: "PATCH", patron: /^\/pedidos\/[^/?]+\/estado$/ }],
  },
  "rutas-configuracion": {
    mutaciones: [{ metodo: "POST", patron: /^\/rutas$/ }],
  },
  "rutas-jornada": {
    mutaciones: [{ metodo: "POST", patron: /^\/rutas\/[^/?]+\/visitas$/ }],
  },
  "seguridad-usuarios": {
    mutaciones: [{ metodo: "POST", patron: /^\/usuarios$/ }],
  },
  "ventas-contado-credito": {
    mutaciones: [{ metodo: "POST", patron: /^\/ventas$/ }],
  },
};

const mutacionesPractica: MutacionPracticaLocal[] = [];
let persistenciaLegadaLimpiada = false;

function limpiarPersistenciaPracticaLegada() {
  if (persistenciaLegadaLimpiada || typeof window === "undefined") return;
  persistenciaLegadaLimpiada = true;
  // Las versiones anteriores persistían cuerpos completos de formularios.
  localStorage.removeItem(CLAVE_MUTACIONES_PRACTICA);
}

function practicaApiActiva() {
  if (typeof window === "undefined") return null;
  limpiarPersistenciaPracticaLegada();
  if (document.documentElement.dataset.capacitacionActiva !== "true")
    return null;
  const leccionId = new URL(window.location.href).searchParams.get("practica");
  if (!leccionId) return null;
  const practica = indicePracticasWeb.find(({ id }) => id === leccionId);
  if (!practica) return null;
  const configuracion = practicasApiPermitidas[leccionId] ?? {
    mutaciones: [],
  };
  const rutaActual = window.location.pathname;
  const rutaValida =
    rutaActual === practica.rutaReal ||
    rutaActual.startsWith(`${practica.rutaReal}/`);
  return { leccionId, configuracion, rutaValida };
}

function cuerpoJson(opciones: RequestInit) {
  if (typeof opciones.body !== "string") return {};
  try {
    return JSON.parse(opciones.body) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function leerMutacionesPractica() {
  return mutacionesPractica;
}

/** Mantiene en pantalla los cambios secuenciales de una práctica sin servidor. */
function aplicarEstadoLocalPractica<T>(
  leccionId: string,
  rutaConsulta: string,
  datos: T,
): T {
  if (
    !rutaConsulta.startsWith("/pedidos") ||
    !datos ||
    typeof datos !== "object"
  )
    return datos;
  const contenedor = datos as { datos?: Array<Record<string, unknown>> };
  if (!Array.isArray(contenedor.datos)) return datos;
  const estados = new Map<string, string>();
  for (const mutacion of leerMutacionesPractica()) {
    if (
      mutacion.leccionId !== leccionId ||
      mutacion.metodo !== "PATCH" ||
      !mutacion.ruta.endsWith("/estado") ||
      typeof mutacion.cuerpo.estado !== "string"
    )
      continue;
    const coincidencia = mutacion.ruta.match(/^\/pedidos\/([^/]+)\/estado$/);
    if (coincidencia?.[1]) estados.set(coincidencia[1], mutacion.cuerpo.estado);
  }
  if (!estados.size) return datos;
  return {
    ...contenedor,
    datos: contenedor.datos.map((pedido) => ({
      ...pedido,
      ...(typeof pedido.id === "string" && estados.has(pedido.id)
        ? { estado: estados.get(pedido.id) }
        : {}),
    })),
  } as T;
}

function respuestaMutacionPractica(
  ruta: string,
  cuerpo: Record<string, unknown>,
) {
  const id = `practica-${Date.now()}`;
  if (ruta === "/ventas") {
    const items = Array.isArray(cuerpo.items)
      ? (cuerpo.items as Array<{ cantidad?: number }>)
      : [];
    const total = items.reduce(
      (suma, item) => suma + Number(item.cantidad ?? 1) * 1_200,
      0,
    );
    const anticipo = Number(cuerpo.anticipo ?? 0);
    return {
      id,
      folio: "PRACTICA-LOCAL",
      total,
      idempotente: false,
      ...(cuerpo.clienteId
        ? {
            resumenSaldo: {
              clienteId: cuerpo.clienteId,
              saldoAnterior: 500,
              cargoVenta: total,
              anticipo,
              saldoNuevo: 500 + total - anticipo,
            },
          }
        : {}),
    };
  }
  if (ruta === "/abonos") {
    const monto = Number(cuerpo.monto ?? 0);
    return { id, saldoAnterior: monto + 500, saldoNuevo: 500 };
  }
  if (ruta === "/importaciones/excel")
    return {
      resumen: {
        localidades: 1,
        productos: 2,
        clientes: 3,
        rutas: 1,
      },
    };
  if (ruta.includes("/riesgo/recalcular")) return { total: 8 };
  return { id, ...cuerpo, guardadoLocal: true };
}

function ejecutarMutacionPractica<T>(
  leccionId: string,
  ruta: string,
  opciones: RequestInit,
): Promise<T> {
  const metodo = opciones.method?.toUpperCase() ?? "POST";
  const cuerpo = cuerpoJson(opciones);
  const registro = {
    leccionId,
    metodo,
    ruta,
    cuerpo,
    registradaEn: new Date().toISOString(),
  };
  mutacionesPractica.push(registro);
  if (mutacionesPractica.length > 100) mutacionesPractica.shift();
  window.dispatchEvent(
    new CustomEvent("nexo:capacitacion:mutacion-local", {
      detail: registro,
    }),
  );
  return Promise.resolve(respuestaMutacionPractica(ruta, cuerpo) as T);
}

function csrfDesdeCookie() {
  if (typeof document === "undefined") return "";
  return decodeURIComponent(
    document.cookie
      .split("; ")
      .find((valor) => valor.startsWith("csrf_token="))
      ?.split("=")[1] ?? "",
  );
}

export class ErrorApi extends Error {
  constructor(
    mensaje: string,
    public codigo: string,
    public estado: number,
    /** Corresponde al encabezado X-Request-Id enviado y/o recibido. */
    public solicitudId?: string,
  ) {
    super(mensaje);
    this.name = "ErrorApi";
  }
}

function nuevaSolicitudId() {
  if (typeof globalThis.crypto?.randomUUID === "function")
    return globalThis.crypto.randomUUID();
  return `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function crearControlTiempo(
  senalExterna: AbortSignal | null | undefined,
  tiempoMaximoMs: number,
) {
  const controlador = new AbortController();
  let vencio = false;
  const abortarPorSenal = () => controlador.abort(senalExterna?.reason);
  if (senalExterna?.aborted) abortarPorSenal();
  else senalExterna?.addEventListener("abort", abortarPorSenal, { once: true });
  const temporizador = globalThis.setTimeout(() => {
    vencio = true;
    controlador.abort(
      new DOMException("Tiempo de espera agotado", "TimeoutError"),
    );
  }, tiempoMaximoMs);
  controladoresActivos.add(controlador);
  return {
    senal: controlador.signal,
    vencio: () => vencio,
    liberar: () => {
      globalThis.clearTimeout(temporizador);
      senalExterna?.removeEventListener("abort", abortarPorSenal);
      controladoresActivos.delete(controlador);
    },
  };
}

async function fetchControlado(
  url: string,
  opciones: RequestInit,
  tiempoMaximoMs: number,
  solicitudId: string,
) {
  const control = crearControlTiempo(opciones.signal, tiempoMaximoMs);
  try {
    return await fetch(url, { ...opciones, signal: control.senal });
  } catch (error) {
    if (control.vencio())
      throw new ErrorApi(
        "La solicitud tardó demasiado. Verifica tu conexión e inténtalo nuevamente.",
        "TIEMPO_AGOTADO",
        408,
        solicitudId,
      );
    if (control.senal.aborted)
      throw new ErrorApi(
        "La solicitud fue cancelada.",
        "SOLICITUD_CANCELADA",
        0,
        solicitudId,
      );
    throw new ErrorApi(
      "No se pudo conectar con el servidor.",
      "ERROR_RED",
      0,
      solicitudId,
    );
  } finally {
    control.liberar();
  }
}

function encabezadosSolicitud(
  metodo: string,
  esConsulta: boolean,
  opciones: RequestInit,
  solicitudId: string,
) {
  const encabezados = new Headers(opciones.headers);
  if (typeof opciones.body === "string" && !encabezados.has("Content-Type"))
    encabezados.set("Content-Type", "application/json");
  if (esConsulta) {
    encabezados.set("Cache-Control", "no-cache");
    encabezados.set("Pragma", "no-cache");
  } else {
    encabezados.set("X-CSRF-Token", csrfDesdeCookie());
  }
  if (!encabezados.has("X-Request-Id"))
    encabezados.set("X-Request-Id", solicitudId);
  return encabezados;
}

function puedeRenovarSesion(ruta: string) {
  return ruta === "/auth/sesion" || !ruta.startsWith("/auth/");
}

let sesionYaInvalidada = false;

export function limpiarEstadoApi() {
  consultasRecientes.clear();
  mutacionesPractica.splice(0, mutacionesPractica.length);
  if (typeof window !== "undefined")
    localStorage.removeItem(CLAVE_MUTACIONES_PRACTICA);
  for (const controlador of controladoresActivos)
    controlador.abort(new DOMException("Sesión finalizada", "AbortError"));
  controladoresActivos.clear();
}

function invalidarSesion(
  motivo: "NO_AUTENTICADO" | "RENOVACION_FALLIDA",
  solicitudId?: string,
) {
  limpiarEstadoApi();
  if (sesionYaInvalidada) return;
  sesionYaInvalidada = true;
  notificarSesionInvalidada({ motivo, solicitudId });
}

function renovarSesionCompartida() {
  if (renovacionEnCurso) return renovacionEnCurso;
  const solicitudId = nuevaSolicitudId();
  const opciones: RequestInit = {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: encabezadosSolicitud("POST", false, { body: "{}" }, solicitudId),
    body: "{}",
  };
  renovacionEnCurso = fetchControlado(
    `${base}/auth/renovar`,
    opciones,
    TIEMPO_MAXIMO_RENOVACION_MS,
    solicitudId,
  )
    .then((respuesta) => respuesta.ok)
    .catch(() => false)
    .finally(() => {
      renovacionEnCurso = null;
    });
  return renovacionEnCurso;
}

async function ejecutarSolicitud<T>(
  ruta: string,
  opciones: OpcionesApi = {},
  reintentar = true,
): Promise<T> {
  const metodo = opciones.method?.toUpperCase() ?? "GET";
  const esConsulta = ["GET", "HEAD"].includes(metodo);
  const solicitudId = nuevaSolicitudId();
  const separador = ruta.includes("?") ? "&" : "?";
  const rutaFresca = esConsulta
    ? `${ruta}${separador}__nexo=${Date.now()}-${++secuenciaConsulta}`
    : ruta;
  const { tiempoMaximoMs = TIEMPO_MAXIMO_PREDETERMINADO_MS, ...opcionesFetch } =
    opciones;
  const respuesta = await fetchControlado(
    `${base}${rutaFresca}`,
    {
      ...opcionesFetch,
      // Los recursos operativos (saldo, cartera, stock y rutas) no deben salir
      // del HTTP cache después de una venta, abono o devolución.
      cache: opcionesFetch.cache ?? "no-store",
      credentials: "include",
      headers: encabezadosSolicitud(
        metodo,
        esConsulta,
        opcionesFetch,
        solicitudId,
      ),
    },
    tiempoMaximoMs,
    solicitudId,
  );
  const solicitudIdRespuesta =
    respuesta.headers.get("X-Request-Id") ?? solicitudId;
  if (respuesta.status === 401 && puedeRenovarSesion(ruta)) {
    if (reintentar && (await renovarSesionCompartida()))
      return ejecutarSolicitud<T>(ruta, opciones, false);
    invalidarSesion(
      reintentar ? "RENOVACION_FALLIDA" : "NO_AUTENTICADO",
      solicitudIdRespuesta,
    );
  }
  if (!respuesta.ok) {
    const cuerpo = (await respuesta.json().catch(() => ({}))) as {
      error?: { mensaje?: string; codigo?: string; solicitudId?: string };
    };
    throw new ErrorApi(
      cuerpo.error?.mensaje ?? "No se pudo completar la solicitud.",
      cuerpo.error?.codigo ?? "ERROR",
      respuesta.status,
      cuerpo.error?.solicitudId ?? solicitudIdRespuesta,
    );
  }
  const cuerpo =
    respuesta.status === 204 || metodo === "HEAD"
      ? (undefined as T)
      : await respuesta.json().catch(() => {
          throw new ErrorApi(
            "El servidor devolvió una respuesta inválida.",
            "RESPUESTA_INVALIDA",
            respuesta.status,
            solicitudIdRespuesta,
          );
        });
  if (ruta === "/auth/sesion" || ruta === "/auth/iniciar-sesion")
    sesionYaInvalidada = false;
  if (!esConsulta && !ruta.startsWith("/auth/"))
    notificarCambioDatos({ metodo, ruta });
  return cuerpo as T;
}

/**
 * Todas las consultas GET llegan al servidor. Si la misma consulta se dispara
 * varias veces, una respuesta antigua espera y entrega el resultado de la más
 * reciente para impedir que la interfaz retroceda a información obsoleta.
 */
export function api<T>(
  ruta: string,
  opciones: OpcionesApi = {},
  reintentar = true,
): Promise<T> {
  const metodo = opciones.method?.toUpperCase() ?? "GET";
  const practica = practicaApiActiva();
  if (practica && !["GET", "HEAD"].includes(metodo)) {
    const rutaSinConsulta = ruta.split("?")[0] ?? ruta;
    const mutacionPermitida =
      practica.rutaValida &&
      practica.configuracion.mutaciones.some(
        (mutacion) =>
          mutacion.metodo === metodo && mutacion.patron.test(rutaSinConsulta),
      );
    if (!mutacionPermitida)
      return Promise.reject(
        new ErrorApi(
          "La práctica bloqueó una operación diferente a la esperada.",
          "PRACTICA_OPERACION_NO_PERMITIDA",
          409,
        ),
      );
    return ejecutarMutacionPractica<T>(practica.leccionId, ruta, opciones);
  }
  if (!["GET", "HEAD"].includes(metodo))
    return ejecutarSolicitud<T>(ruta, opciones, reintentar);

  const clave = `${metodo}:${ruta}`;
  const secuencia = ++secuenciaConsulta;
  const solicitud = ejecutarSolicitud<T>(ruta, opciones, reintentar).then(
    (datos) =>
      practica?.rutaValida
        ? aplicarEstadoLocalPractica(practica.leccionId, ruta, datos)
        : datos,
  );
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
