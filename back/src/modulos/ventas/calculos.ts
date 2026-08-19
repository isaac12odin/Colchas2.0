import { PeriodicidadPago } from "@prisma/client";
import { addDays, addMonths, addWeeks } from "date-fns";

export interface PlanCuotas {
  periodicidad: PeriodicidadPago;
  montoCuota: number;
  primerVencimiento: Date;
}

export function calcularFechaCuota(
  inicio: Date,
  periodicidad: PeriodicidadPago,
  indice: number,
) {
  if (periodicidad === "SEMANAL") return addWeeks(inicio, indice);
  if (periodicidad === "QUINCENAL") return addDays(inicio, indice * 15);
  return addMonths(inicio, indice);
}

export function generarCuotas(financiado: number, plan?: PlanCuotas) {
  if (!(financiado > 0) || !plan) return [];

  const numeroCuotas = Math.ceil(financiado / plan.montoCuota);
  return Array.from({ length: numeroCuotas }, (_, indice) => ({
    numero: indice + 1,
    fechaVence: calcularFechaCuota(
      plan.primerVencimiento,
      plan.periodicidad,
      indice,
    ),
    monto: Math.min(plan.montoCuota, financiado - plan.montoCuota * indice),
  }));
}
