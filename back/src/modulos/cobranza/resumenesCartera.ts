import { prisma } from "../../infraestructura/prisma.js";

import {
  calcularEstadoCuenta,
  type EstadoCuentaCliente,
} from "./estadoCuenta.js";

export async function obtenerResumenesCarteraClientes(
  clienteIds: readonly string[],
  fechaCorte = new Date(),
  incluirHistorico = false,
) {
  const ids = [...new Set(clienteIds)];
  if (!ids.length) return new Map<string, EstadoCuentaCliente>();

  const [clientes, cuotas] = await Promise.all([
    prisma.cliente.findMany({
      where: { id: { in: ids } },
      select: { id: true, saldo: true, acuerdoPago: true },
    }),
    prisma.cuota.findMany({
      where: {
        planPago: {
          venta: { clienteId: { in: ids }, estado: "CONFIRMADA" },
        },
        ...(incluirHistorico
          ? {}
          : { estado: { in: ["PENDIENTE", "PARCIAL", "VENCIDA"] } }),
      },
      select: {
        id: true,
        fechaVence: true,
        monto: true,
        montoPagado: true,
        pagadaEn: true,
        planPago: { select: { venta: { select: { clienteId: true } } } },
      },
      orderBy: [{ fechaVence: "asc" }, { numero: "asc" }],
    }),
  ]);

  const cuotasPorCliente = new Map<string, typeof cuotas>();
  for (const cuota of cuotas) {
    const clienteId = cuota.planPago.venta.clienteId;
    if (!clienteId) continue;
    const actuales = cuotasPorCliente.get(clienteId) ?? [];
    actuales.push(cuota);
    cuotasPorCliente.set(clienteId, actuales);
  }

  return new Map(
    clientes.map((cliente) => [
      cliente.id,
      calcularEstadoCuenta(
        {
          saldoTotal: Number(cliente.saldo?.saldoActual ?? 0),
          vencidoRegistrado: Number(cliente.saldo?.vencidoActual ?? 0),
          abonoPeriodico: Number(cliente.acuerdoPago?.montoPeriodico ?? 0),
          cuotas: (cuotasPorCliente.get(cliente.id) ?? []).map((cuota) => ({
            id: cuota.id,
            fechaVence: cuota.fechaVence,
            monto: Number(cuota.monto),
            montoPagado: Number(cuota.montoPagado),
            pagadaEn: cuota.pagadaEn,
          })),
        },
        fechaCorte,
      ),
    ]),
  );
}
