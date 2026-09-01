import type { Rol, UsuarioSesion } from "./tipos";

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
  | "usuarios"
  | "capacitacion";

/**
 * Matriz de navegación de la web. La API vuelve a validar cada operación;
 * esta capa evita mostrar o abrir pantallas que no corresponden al puesto.
 */
export const rolesPorModuloWeb: Record<ModuloWeb, readonly Rol[]> = {
  inicio: ["ADMINISTRADOR", "CONTABLE", "VENDEDOR"],
  clientes: ["ADMINISTRADOR", "CONTABLE", "VENDEDOR"],
  ventas: ["ADMINISTRADOR", "CONTABLE", "VENDEDOR"],
  inventario: ["ADMINISTRADOR", "CONTABLE"],
  rutas: ["ADMINISTRADOR"],
  pedidos: ["ADMINISTRADOR", "CONTABLE", "VENDEDOR"],
  compras: ["ADMINISTRADOR"],
  devoluciones: ["ADMINISTRADOR", "CONTABLE"],
  cortes: ["ADMINISTRADOR", "CONTABLE"],
  alertas: ["ADMINISTRADOR", "CONTABLE", "VENDEDOR"],
  configuracion: ["ADMINISTRADOR"],
  reportes: ["ADMINISTRADOR", "CONTABLE"],
  usuarios: ["ADMINISTRADOR"],
  capacitacion: ["ADMINISTRADOR", "CONTABLE", "VENDEDOR"],
};

export function esRolExclusivoMovil(rol: Rol) {
  return rol === "ALMACENISTA" || rol === "COBRADOR";
}

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
  void rol;
  return "/inicio";
}

/** La credencial temporal nunca abre primero un módulo operativo. */
export function obtenerRutaTrasAutenticacionWeb(
  usuario: Pick<UsuarioSesion, "rol" | "debeCambiarContrasena">,
) {
  return usuario.debeCambiarContrasena
    ? "/perfil"
    : obtenerRutaInicialWeb(usuario.rol);
}
