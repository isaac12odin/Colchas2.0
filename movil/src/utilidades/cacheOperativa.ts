import { esFalloRealRed } from "../erroresApi";

/**
 * Una cola offline sólo puede conservar una proyección si existe la caché del
 * recurso principal. Catálogos auxiliares no sustituyen rutas o pedidos.
 */
export function puedeUsarCacheOperativa<T>(
  pendientes: number,
  cachePrincipal: T[] | null | undefined,
): cachePrincipal is T[] {
  return pendientes > 0 && Array.isArray(cachePrincipal);
}

export type DecisionProyeccionPendiente<T> =
  | { usar: false }
  | { usar: true; datos: T; offline: boolean };

/**
 * Una proyección con movimientos pendientes sigue siendo la representación
 * local más completa, pero antes de mostrarla se revalida la sesión contra el
 * servidor. Sólo un ErrorApi de transporte habilita el distintivo offline;
 * rechazos HTTP se propagan para que la pantalla no revele datos guardados.
 */
export async function resolverProyeccionPendiente<T>(entrada: {
  pendientes: number;
  cachePrincipal: T | null | undefined;
  revalidarSesion: () => Promise<unknown>;
}): Promise<DecisionProyeccionPendiente<T>> {
  if (entrada.pendientes <= 0 || entrada.cachePrincipal == null)
    return { usar: false };

  try {
    await entrada.revalidarSesion();
    return { usar: true, datos: entrada.cachePrincipal, offline: false };
  } catch (error) {
    if (esFalloRealRed(error))
      return { usar: true, datos: entrada.cachePrincipal, offline: true };
    throw error;
  }
}
