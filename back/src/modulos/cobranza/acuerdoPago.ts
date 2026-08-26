import type { PeriodicidadPago, Prisma } from "@prisma/client";
import { addDays, addMonths, addWeeks } from "date-fns";

interface PlanSolicitado {
  periodicidad: PeriodicidadPago;
  montoCuota: number;
  primerVencimiento: Date;
}

function fechaMayor(a: Date, b: Date) {
  return a.getTime() >= b.getTime() ? a : b;
}

function siguienteVencimiento(fecha: Date, periodicidad: PeriodicidadPago) {
  if (periodicidad === "SEMANAL") return addWeeks(fecha, 1);
  if (periodicidad === "QUINCENAL") return addDays(fecha, 15);
  return addMonths(fecha, 1);
}

export async function resolverAcuerdoParaVenta(
  tx: Prisma.TransactionClient,
  clienteId: string,
  fechaVenta: Date,
  planSolicitado: PlanSolicitado,
) {
  const [cliente, ultimoPendiente] = await Promise.all([
    tx.cliente.findUniqueOrThrow({
      where: { id: clienteId },
      select: { saldo: true, acuerdoPago: true },
    }),
    tx.cuota.findFirst({
      where: {
        planPago: { venta: { clienteId, estado: "CONFIRMADA" } },
        estado: { in: ["PENDIENTE", "PARCIAL", "VENCIDA"] },
      },
      orderBy: { fechaVence: "desc" },
      select: { fechaVence: true },
    }),
  ]);
  const tieneDeuda = Number(cliente.saldo?.saldoActual ?? 0) > 0;

  if (!cliente.acuerdoPago || !tieneDeuda) {
    const acuerdo = await tx.acuerdoPagoCliente.upsert({
      where: { clienteId },
      create: {
        clienteId,
        periodicidad: planSolicitado.periodicidad,
        montoPeriodico: planSolicitado.montoCuota,
      },
      update: {
        periodicidad: planSolicitado.periodicidad,
        montoPeriodico: planSolicitado.montoCuota,
        activo: true,
      },
    });
    return {
      plan: planSolicitado,
      acuerdo,
      respetado: false,
    };
  }

  const base = ultimoPendiente
    ? fechaMayor(fechaVenta, ultimoPendiente.fechaVence)
    : fechaVenta;
  const plan = {
    periodicidad: cliente.acuerdoPago.periodicidad,
    montoCuota: Number(cliente.acuerdoPago.montoPeriodico),
    primerVencimiento: siguienteVencimiento(
      base,
      cliente.acuerdoPago.periodicidad,
    ),
  };
  return { plan, acuerdo: cliente.acuerdoPago, respetado: true };
}
