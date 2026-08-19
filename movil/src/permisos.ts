import type { Rol } from "./tipos";

export type ModuloMovil =
  | "inicio"
  | "cobranza"
  | "ventaCampo"
  | "inventario"
  | "pedidos"
  | "sincronizacion"
  | "resumen"
  | "cambioContrasena";

export const rolesPorModuloMovil: Record<ModuloMovil, readonly Rol[]> = {
  inicio: ["ADMINISTRADOR", "CONTABLE", "VENDEDOR", "ALMACENISTA", "COBRADOR"],
  cobranza: ["ADMINISTRADOR", "COBRADOR"],
  ventaCampo: ["ADMINISTRADOR", "COBRADOR"],
  inventario: ["ADMINISTRADOR", "ALMACENISTA"],
  pedidos: ["ADMINISTRADOR", "CONTABLE", "VENDEDOR", "ALMACENISTA", "COBRADOR"],
  sincronizacion: ["ADMINISTRADOR", "COBRADOR"],
  resumen: ["ADMINISTRADOR", "CONTABLE"],
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
