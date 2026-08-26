export const TAMANO_LOTE_SINCRONIZACION = 100;

export function planificarLotes(
  total: number,
  limite = TAMANO_LOTE_SINCRONIZACION,
) {
  if (
    !Number.isInteger(total) ||
    total < 0 ||
    !Number.isInteger(limite) ||
    limite < 1 ||
    limite > 500
  )
    throw new Error("La planificación de sincronización no es válida.");
  const tamanos: number[] = [];
  for (let pendientes = total; pendientes > 0; pendientes -= limite)
    tamanos.push(Math.min(limite, pendientes));
  return tamanos;
}
