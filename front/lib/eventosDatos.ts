export const EVENTO_DATOS_CAMBIARON = "nexo:datos-cambiaron";
export const EVENTO_SESION_INVALIDADA = "nexo:sesion-invalidada";
const CANAL_COORDINACION = "nexo:coordinacion-web:v1";
const INSTANCIA_NAVEGADOR =
  typeof window === "undefined"
    ? "servidor"
    : typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `pestana-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export type RecursoDatos =
  | "abonos"
  | "alertas"
  | "clientes"
  | "compras"
  | "configuracion"
  | "cortes"
  | "devoluciones"
  | "inicio"
  | "inventario"
  | "localidades"
  | "pedidos"
  | "proveedores"
  | "reportes"
  | "rutas"
  | "usuarios"
  | "ventas";

export interface CambioDatos {
  metodo: string;
  ruta: string;
  ocurridoEn: number;
  recursos: readonly RecursoDatos[];
}

export interface SesionInvalidada {
  motivo: "NO_AUTENTICADO" | "RENOVACION_FALLIDA" | "CIERRE_SESION";
  solicitudId?: string;
  ocurridoEn: number;
}

type MensajeCoordinacion =
  | { tipo: "DATOS"; origen: string; detalle: CambioDatos }
  | { tipo: "SESION"; origen: string; detalle: SesionInvalidada };

let canalEmisor: BroadcastChannel | null = null;

function publicarEntrePestanas(mensaje: MensajeCoordinacion) {
  if (typeof BroadcastChannel === "undefined") return;
  canalEmisor ??= new BroadcastChannel(CANAL_COORDINACION);
  canalEmisor.postMessage(mensaje);
}

function suscribirCanal(recibir: (mensaje: MensajeCoordinacion) => void) {
  if (typeof BroadcastChannel === "undefined") return () => undefined;
  const canal = new BroadcastChannel(CANAL_COORDINACION);
  const escuchar = (evento: MessageEvent<MensajeCoordinacion>) => {
    if (!evento.data || evento.data.origen === INSTANCIA_NAVEGADOR) return;
    recibir(evento.data);
  };
  canal.addEventListener("message", escuchar);
  return () => {
    canal.removeEventListener("message", escuchar);
    canal.close();
  };
}

const recursosPorRaiz: Record<string, readonly RecursoDatos[]> = {
  abonos: [
    "abonos",
    "alertas",
    "clientes",
    "cortes",
    "inicio",
    "reportes",
    "rutas",
  ],
  alertas: ["alertas", "inicio"],
  clientes: [
    "alertas",
    "clientes",
    "inicio",
    "pedidos",
    "reportes",
    "rutas",
    "ventas",
  ],
  compras: [
    "alertas",
    "compras",
    "inicio",
    "inventario",
    "pedidos",
    "reportes",
  ],
  cortes: ["cortes", "inicio", "reportes"],
  devoluciones: [
    "alertas",
    "clientes",
    "cortes",
    "devoluciones",
    "inicio",
    "inventario",
    "reportes",
    "ventas",
  ],
  importaciones: [
    "alertas",
    "clientes",
    "compras",
    "configuracion",
    "cortes",
    "devoluciones",
    "inicio",
    "inventario",
    "localidades",
    "pedidos",
    "proveedores",
    "reportes",
    "rutas",
    "usuarios",
    "ventas",
  ],
  inventario: ["alertas", "inicio", "inventario", "pedidos", "reportes"],
  localidades: ["clientes", "configuracion", "inicio", "localidades", "rutas"],
  pedidos: [
    "alertas",
    "clientes",
    "inicio",
    "inventario",
    "pedidos",
    "reportes",
    "ventas",
  ],
  proveedores: ["compras", "configuracion", "pedidos", "proveedores"],
  rutas: ["alertas", "clientes", "cortes", "inicio", "reportes", "rutas"],
  usuarios: ["configuracion", "cortes", "rutas", "usuarios"],
  ventas: [
    "alertas",
    "clientes",
    "cortes",
    "inicio",
    "inventario",
    "pedidos",
    "reportes",
    "ventas",
  ],
};

function raizRuta(ruta: string) {
  return ruta.split("?")[0]?.split("/").filter(Boolean)[0] ?? "inicio";
}

/** Declara únicamente las pantallas que una escritura puede dejar obsoletas. */
export function recursosAfectadosPorRuta(ruta: string) {
  const raiz = raizRuta(ruta);
  return recursosPorRaiz[raiz] ?? ([raiz] as readonly RecursoDatos[]);
}

/** Recurso principal de la pantalla actual; soporta rutas dinámicas de cliente. */
export function recursosParaPantalla(ruta: string) {
  return [raizRuta(ruta)] as readonly RecursoDatos[];
}

export function notificarCambioDatos(
  cambio: Omit<CambioDatos, "ocurridoEn" | "recursos">,
) {
  if (typeof window === "undefined") return;
  const detalle: CambioDatos = {
    ...cambio,
    ocurridoEn: Date.now(),
    recursos: recursosAfectadosPorRuta(cambio.ruta),
  };
  window.dispatchEvent(
    new CustomEvent<CambioDatos>(EVENTO_DATOS_CAMBIARON, {
      detail: detalle,
    }),
  );
  publicarEntrePestanas({
    tipo: "DATOS",
    origen: INSTANCIA_NAVEGADOR,
    detalle,
  });
}

export function suscribirCambioDatos(
  actualizar: () => void,
  recursos?: readonly RecursoDatos[],
) {
  if (typeof window === "undefined") return () => undefined;
  const filtro = recursos?.length ? new Set(recursos) : null;
  const atenderDetalle = (detalle: CambioDatos) => {
    // Los eventos antiguos o manuales sin detalle continúan siendo globales.
    if (
      filtro &&
      detalle?.recursos?.length &&
      !detalle.recursos.some((recurso) => filtro.has(recurso))
    )
      return;
    actualizar();
  };
  const alCambiar = (evento: Event) =>
    atenderDetalle((evento as CustomEvent<CambioDatos>).detail);
  window.addEventListener(EVENTO_DATOS_CAMBIARON, alCambiar);
  const cancelarCanal = suscribirCanal((mensaje) => {
    if (mensaje.tipo === "DATOS") atenderDetalle(mensaje.detalle);
  });
  return () => {
    window.removeEventListener(EVENTO_DATOS_CAMBIARON, alCambiar);
    cancelarCanal();
  };
}

export function notificarSesionInvalidada(
  detalle: Omit<SesionInvalidada, "ocurridoEn">,
) {
  if (typeof window === "undefined") return;
  const detalleCompleto = { ...detalle, ocurridoEn: Date.now() };
  window.dispatchEvent(
    new CustomEvent<SesionInvalidada>(EVENTO_SESION_INVALIDADA, {
      detail: detalleCompleto,
    }),
  );
  publicarEntrePestanas({
    tipo: "SESION",
    origen: INSTANCIA_NAVEGADOR,
    detalle: detalleCompleto,
  });
}

export function suscribirSesionInvalidada(
  alInvalidar: (detalle: SesionInvalidada) => void,
) {
  if (typeof window === "undefined") return () => undefined;
  const escuchar = (evento: Event) =>
    alInvalidar((evento as CustomEvent<SesionInvalidada>).detail);
  window.addEventListener(EVENTO_SESION_INVALIDADA, escuchar);
  const cancelarCanal = suscribirCanal((mensaje) => {
    if (mensaje.tipo === "SESION") alInvalidar(mensaje.detalle);
  });
  return () => {
    window.removeEventListener(EVENTO_SESION_INVALIDADA, escuchar);
    cancelarCanal();
  };
}
