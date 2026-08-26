/**
 * Mantiene los cálculos visibles y las proyecciones offline en centavos.
 * PostgreSQL conserva la cifra definitiva; el móvil no arrastra flotantes como
 * 99.999999 al mostrar o volver a sincronizar saldos.
 */
export function redondearMoneda(valor: number) {
  if (!Number.isFinite(valor)) return 0;
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}
