import { differenceInCalendarDays, subDays } from "date-fns";
import { Prisma } from "@prisma/client";

export async function recalcularRiesgoCliente(
  tx: Prisma.TransactionClient,
  clienteId: string,
) {
  const ahora = new Date();
  const [saldo, cuotas, visitasSinPago] = await Promise.all([
    tx.saldoCliente.findUnique({ where: { clienteId } }),
    tx.cuota.findMany({
      where: {
        planPago: { venta: { clienteId, estado: "CONFIRMADA" } },
        estado: { in: ["PENDIENTE", "PARCIAL", "VENCIDA"] },
        fechaVence: { lt: ahora },
      },
    }),
    tx.visitaCobranza.count({
      where: {
        clienteId,
        resultado: { in: ["NO_PAGO", "AUSENTE"] },
        fechaProgramada: { gte: subDays(ahora, 90) },
      },
    }),
  ]);
  const vencido = cuotas.reduce(
    (suma, cuota) => suma + Number(cuota.monto) - Number(cuota.montoPagado),
    0,
  );
  const diasMoraMaximos = cuotas.reduce(
    (maximo, cuota) =>
      Math.max(maximo, differenceInCalendarDays(ahora, cuota.fechaVence)),
    0,
  );
  const totalCargos = Number(saldo?.totalCargos ?? 0);
  const porcentajePagado =
    totalCargos > 0
      ? Math.min(100, (Number(saldo?.totalAbonos ?? 0) / totalCargos) * 100)
      : 100;
  const factorSaldo =
    Number(saldo?.saldoActual ?? 0) > 0 && porcentajePagado < 25 ? 15 : 0;
  const puntuacion = Math.min(
    100,
    cuotas.length * 10 +
      Math.min(40, diasMoraMaximos) +
      Math.min(30, visitasSinPago * 6) +
      factorSaldo,
  );
  const nivel =
    puntuacion >= 75
      ? "CRITICO"
      : puntuacion >= 50
        ? "ALTO"
        : puntuacion >= 25
          ? "MEDIO"
          : "BAJO";
  const razon = cuotas.length
    ? `${cuotas.length} cuota(s) vencida(s), ${diasMoraMaximos} dia(s) maximos de mora y ${visitasSinPago} visita(s) sin pago en 90 dias.`
    : "Sin cuotas vencidas al momento del calculo.";

  await tx.cuota.updateMany({
    where: {
      id: { in: cuotas.map((cuota) => cuota.id) },
      estado: { in: ["PENDIENTE", "PARCIAL"] },
    },
    data: { estado: "VENCIDA" },
  });
  if (saldo)
    await tx.saldoCliente.update({
      where: { clienteId },
      data: { vencidoActual: vencido },
    });
  return tx.evaluacionRiesgo.create({
    data: {
      clienteId,
      puntuacion,
      nivel,
      cuotasVencidas: cuotas.length,
      diasMoraMaximos,
      porcentajePagado,
      visitasSinPago,
      razon,
    },
  });
}
