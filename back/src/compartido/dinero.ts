import { z } from "zod";

export const MAXIMO_DINERO = 9_999_999_999.99;

/** Convierte cualquier cálculo de negocio a centavos antes de persistirlo. */
export function redondearMoneda(valor: number) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export function tienePrecisionMonetaria(valor: number) {
  return (
    Number.isFinite(valor) && Math.abs(valor - redondearMoneda(valor)) < 1e-9
  );
}

/**
 * Contratos únicos para cantidades monetarias recibidas por la API.
 * PostgreSQL Decimal redondea silenciosamente; por eso la precisión se
 * rechaza antes de llegar a cualquier servicio o transacción.
 */
export const dineroNoNegativo = z.coerce
  .number()
  .finite()
  .min(0)
  .max(MAXIMO_DINERO)
  .refine(tienePrecisionMonetaria, "Use como máximo dos decimales.");

export const dineroPositivo = z.coerce
  .number()
  .finite()
  .positive()
  .max(MAXIMO_DINERO)
  .refine(tienePrecisionMonetaria, "Use como máximo dos decimales.");
