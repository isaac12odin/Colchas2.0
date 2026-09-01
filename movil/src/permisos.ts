import type { Rol } from "./tipos";

export type ModuloMovil =
  | "inicio"
  | "cobranza"
  | "ventaCampo"
  | "inventario"
  | "pedidos"
  | "sincronizacion"
  | "resumen"
  | "capacitacion"
  | "perfil"
  | "cambioContrasena";

export const rolesPorModuloMovil: Record<ModuloMovil, readonly Rol[]> = {
  inicio: ["ADMINISTRADOR", "CONTABLE", "VENDEDOR", "ALMACENISTA", "COBRADOR"],
  cobranza: ["ADMINISTRADOR", "COBRADOR"],
  ventaCampo: ["ADMINISTRADOR", "COBRADOR"],
  inventario: ["ADMINISTRADOR", "ALMACENISTA"],
  pedidos: ["ADMINISTRADOR", "CONTABLE", "VENDEDOR", "ALMACENISTA", "COBRADOR"],
  sincronizacion: ["ADMINISTRADOR", "COBRADOR"],
  resumen: ["ADMINISTRADOR", "CONTABLE"],
  capacitacion: [
    "ADMINISTRADOR",
    "CONTABLE",
    "VENDEDOR",
    "ALMACENISTA",
    "COBRADOR",
  ],
  perfil: ["ADMINISTRADOR", "CONTABLE", "VENDEDOR", "ALMACENISTA", "COBRADOR"],
  cambioContrasena: [
    "ADMINISTRADOR",
    "CONTABLE",
    "VENDEDOR",
    "ALMACENISTA",
    "COBRADOR",
  ],
};

export function puedeAccederModuloMovil(rol: Rol, modulo: ModuloMovil) {
  return rolesPorModuloMovil[modulo].some((permitido) => permitido === rol);
}

const rolesQueCreanPedidos: readonly Rol[] = [
  "ADMINISTRADOR",
  "CONTABLE",
  "VENDEDOR",
  "COBRADOR",
];

export function puedeCrearPedidoMovil(rol: Rol) {
  return rolesQueCreanPedidos.includes(rol);
}

function obtenerModuloMovil(
  segmentos: readonly string[],
): ModuloMovil | undefined {
  const seccion = segmentos.find((segmento) => segmento !== "(app)");
  switch (seccion) {
    case undefined:
    case "index":
      return "inicio";
    case "rutas":
    case "ruta":
      return "cobranza";
    case "venta":
      return "ventaCampo";
    case "inventario":
      return "inventario";
    case "pedidos":
      return "pedidos";
    case "pendientes":
      return "sincronizacion";
    case "resumen":
      return "resumen";
    case "capacitacion":
      return "capacitacion";
    case "perfil":
      return "perfil";
    case "cambiar-contrasena":
      return "cambioContrasena";
    default:
      // Las pantallas nuevas quedan cerradas hasta asignarles un permiso.
      return undefined;
  }
}

export function puedeAccederRutaMovil(rol: Rol, segmentos: readonly string[]) {
  const modulo = obtenerModuloMovil(segmentos);
  return modulo ? puedeAccederModuloMovil(rol, modulo) : false;
}

/**
 * Una credencial temporal sólo puede abrir la pantalla real donde se sustituye.
 * Se mantiene pura para que el guard de navegación pueda probarse sin Expo.
 */
export function debeForzarCambioContrasena(
  debeCambiarContrasena: boolean,
  segmentos: readonly string[],
) {
  return (
    debeCambiarContrasena &&
    obtenerModuloMovil(segmentos) !== "cambioContrasena"
  );
}

/** El enrolamiento HMAC se pospone hasta confirmar una contraseña propia. */
export function debePrepararIntegridadDispositivo(
  rol: Rol,
  debeCambiarContrasena: boolean,
) {
  return (
    !debeCambiarContrasena && (rol === "ADMINISTRADOR" || rol === "COBRADOR")
  );
}
