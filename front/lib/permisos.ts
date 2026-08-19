import type { Rol } from "./tipos";

export type ModuloWeb =
  | "inicio"
  | "clientes"
  | "ventas"
  | "inventario"
  | "rutas"
  | "pedidos"
  | "compras"
  | "devoluciones"
  | "cortes"
  | "alertas"
  | "configuracion"
  | "reportes"
  | "usuarios";

/**
 * Matriz de navegación de la web. La API vuelve a validar cada operación;
 * esta capa evita mostrar o abrir pantallas que no corresponden al puesto.
 */
export const rolesPorModuloWeb: Record<ModuloWeb, readonly Rol[]> = {
  inicio: ["ADMINISTRADOR", "CONTABLE"],
  clientes: ["ADMINISTRADOR", "CONTABLE", "VENDEDOR", "COBRADOR"],
  ventas: ["ADMINISTRADOR", "CONTABLE", "VENDEDOR"],
  inventario: ["ADMINISTRADOR", "CONTABLE", "ALMACENISTA"],
  rutas: ["ADMINISTRADOR", "COBRADOR"],
  pedidos: ["ADMINISTRADOR", "CONTABLE", "VENDEDOR", "ALMACENISTA", "COBRADOR"],
  compras: ["ADMINISTRADOR", "ALMACENISTA"],
  devoluciones: ["ADMINISTRADOR", "CONTABLE", "ALMACENISTA"],
  cortes: ["ADMINISTRADOR", "CONTABLE", "COBRADOR"],
  alertas: ["ADMINISTRADOR", "CONTABLE", "VENDEDOR", "ALMACENISTA", "COBRADOR"],
  configuracion: ["ADMINISTRADOR"],
  reportes: ["ADMINISTRADOR", "CONTABLE"],
  usuarios: ["ADMINISTRADOR"],
};

const modulosPorRuta: ReadonlyArray<{
  prefijo: `/${ModuloWeb}`;
  modulo: ModuloWeb;
}> = (Object.keys(rolesPorModuloWeb) as ModuloWeb[]).map((modulo) => ({
  prefijo: `/${modulo}`,
  modulo,
}));

export function puedeAccederModuloWeb(rol: Rol, modulo: ModuloWeb) {
  return rolesPorModuloWeb[modulo].some((permitido) => permitido === rol);
}

export function puedeAccederRutaWeb(rol: Rol, ruta: string) {
  if (ruta === "/perfil" || ruta.startsWith("/perfil/")) return true;
  const coincidencia = modulosPorRuta.find(
    ({ prefijo }) => ruta === prefijo || ruta.startsWith(`${prefijo}/`),
  );
  return coincidencia ? puedeAccederModuloWeb(rol, coincidencia.modulo) : false;
}

/** Primera pantalla útil, nunca una sección prohibida para el rol. */
export function obtenerRutaInicialWeb(rol: Rol) {
  switch (rol) {
    case "ALMACENISTA":
      return "/inventario";
    case "COBRADOR":
      return "/rutas";
    case "VENDEDOR":
      return "/ventas";
    case "ADMINISTRADOR":
    case "CONTABLE":
      return "/inicio";
  }
}
