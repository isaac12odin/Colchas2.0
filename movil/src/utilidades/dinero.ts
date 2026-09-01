/**
 * Mantiene los cálculos visibles y las proyecciones offline en centavos.
 * PostgreSQL conserva la cifra definitiva; el móvil no arrastra flotantes como
 * 99.999999 al mostrar o volver a sincronizar saldos.
 */
export function redondearMoneda(valor: number) {
  if (!Number.isFinite(valor)) return 0;
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/**
 * Interpreta importes escritos con punto o coma decimal sin convertir texto
 * inválido, infinito o incompleto en cero. Los formularios deben distinguir
 * claramente entre "$0" y una captura que todavía no es un número.
 */
export function parsearDineroCapturado(valor: string): number | null {
  const limpio = valor.trim();
  if (!limpio) return null;
  if (!/^(?:\d+(?:[.,]\d{0,2})?|[.,]\d{1,2})$/.test(limpio)) return null;
  const numero = Number(limpio.replace(",", "."));
  return Number.isFinite(numero) ? redondearMoneda(numero) : null;
}
