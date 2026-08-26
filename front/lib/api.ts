import { notificarCambioDatos } from "./eventosDatos";

const base = process.env.NEXT_PUBLIC_API_URL ?? "/api";
let secuenciaConsulta = 0;
const consultasRecientes = new Map<
  string,
  { secuencia: number; promesa: Promise<unknown> }
>();
const MAXIMO_CONSULTAS_RASTREADAS = 200;
let renovacionEnCurso: Promise<boolean> | null = null;

const CLAVE_MUTACIONES_PRACTICA = "nexo:capacitacion:mutaciones-reales:v3";

interface MutacionPracticaLocal {
  leccionId: string;
  metodo: string;
  ruta: string;
  cuerpo: Record<string, unknown>;
  registradaEn: string;
}

function leccionPracticaActiva() {
  if (typeof window === "undefined") return null;
  return new URL(window.location.href).searchParams.get("practica");
}

function limpiarDatosSensibles(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(limpiarDatosSensibles);
  if (!valor || typeof valor !== "object") return valor;
  return Object.fromEntries(
    Object.entries(valor as Record<string, unknown>).map(([clave, dato]) => [
      clave,
      /contrasena|password|token|secreto|archivoBase64/i.test(clave)
        ? "[NO GUARDADO]"
        : limpiarDatosSensibles(dato),
    ]),
  );
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
  if (typeof window === "undefined") return [];
  try {
    const guardado = JSON.parse(
      localStorage.getItem(CLAVE_MUTACIONES_PRACTICA) ?? "[]",
    ) as unknown;
    return Array.isArray(guardado)
      ? guardado.filter(
          (item): item is MutacionPracticaLocal =>
            typeof item === "object" &&
            item !== null &&
            "leccionId" in item &&
            "metodo" in item &&
            "ruta" in item &&
            "cuerpo" in item,
        )
      : [];
  } catch {
    return [];
  }
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
    cuerpo: limpiarDatosSensibles(cuerpo),
    registradaEn: new Date().toISOString(),
  };
  const historial = leerMutacionesPractica();
  localStorage.setItem(
    CLAVE_MUTACIONES_PRACTICA,
    JSON.stringify([...historial, registro].slice(-100)),
  );
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
  ) {
    super(mensaje);
  }
}

function renovarSesionCompartida() {
  if (renovacionEnCurso) return renovacionEnCurso;
  renovacionEnCurso = fetch(`${base}/auth/renovar`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfDesdeCookie(),
    },
    body: "{}",
  })
    .then((respuesta) => respuesta.ok)
    .catch(() => false)
    .finally(() => {
      renovacionEnCurso = null;
    });
  return renovacionEnCurso;
}

async function ejecutarSolicitud<T>(
  ruta: string,
  opciones: RequestInit = {},
  reintentar = true,
): Promise<T> {
  const metodo = opciones.method?.toUpperCase() ?? "GET";
  const esConsulta = ["GET", "HEAD"].includes(metodo);
  const separador = ruta.includes("?") ? "&" : "?";
  const rutaFresca = esConsulta
    ? `${ruta}${separador}__nexo=${Date.now()}-${++secuenciaConsulta}`
    : ruta;
  const respuesta = await fetch(`${base}${rutaFresca}`, {
    ...opciones,
    // Los recursos operativos (saldo, cartera, stock y rutas) no deben salir
    // del HTTP cache después de una venta, abono o devolución.
    cache: opciones.cache ?? "no-store",
    credentials: "include",
    headers: {
      ...(opciones.body ? { "Content-Type": "application/json" } : {}),
      ...(esConsulta
        ? { "Cache-Control": "no-cache", Pragma: "no-cache" }
        : {}),
      ...(!["GET", "HEAD"].includes(metodo)
        ? { "X-CSRF-Token": csrfDesdeCookie() }
        : {}),
      ...opciones.headers,
    },
  });
  if (respuesta.status === 401 && reintentar && !ruta.startsWith("/auth/")) {
    if (await renovarSesionCompartida())
      return ejecutarSolicitud<T>(ruta, opciones, false);
  }
  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => ({
      error: {
        mensaje: "No se pudo completar la solicitud.",
        codigo: "ERROR_RED",
      },
    }));
    throw new ErrorApi(
      cuerpo.error?.mensaje ?? "Ocurrio un error.",
      cuerpo.error?.codigo ?? "ERROR",
      respuesta.status,
    );
  }
  const cuerpo =
    respuesta.status === 204
      ? (undefined as T)
      : ((await respuesta.json()) as T);
  if (!esConsulta && !ruta.startsWith("/auth/"))
    notificarCambioDatos({ metodo, ruta });
  return cuerpo;
}

/**
 * Todas las consultas GET llegan al servidor. Si la misma consulta se dispara
 * varias veces, una respuesta antigua espera y entrega el resultado de la más
 * reciente para impedir que la interfaz retroceda a información obsoleta.
 */
export function api<T>(
  ruta: string,
  opciones: RequestInit = {},
  reintentar = true,
): Promise<T> {
  const metodo = opciones.method?.toUpperCase() ?? "GET";
  const practica = leccionPracticaActiva();
  if (practica && !["GET", "HEAD"].includes(metodo))
    return ejecutarMutacionPractica<T>(practica, ruta, opciones);
  if (!["GET", "HEAD"].includes(metodo))
    return ejecutarSolicitud<T>(ruta, opciones, reintentar);

  const clave = `${metodo}:${ruta}`;
  const secuencia = ++secuenciaConsulta;
  const solicitud = ejecutarSolicitud<T>(ruta, opciones, reintentar).then(
    (datos) =>
      practica ? aplicarEstadoLocalPractica(practica, ruta, datos) : datos,
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
