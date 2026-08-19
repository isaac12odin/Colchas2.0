import { Prisma, TipoVenta } from "@prisma/client";

import type { NuevaVenta } from "./esquemas.js";

interface VentaCreada {
  id: string;
  folio: string;
}

export async function registrarSaldoVenta(
  tx: Prisma.TransactionClient,
  entrada: NuevaVenta,
  venta: VentaCreada,
  usuarioId: string,
  total: number,
  financiado: number,
) {
  if (!entrada.clienteId || entrada.tipo !== TipoVenta.CREDITO) return;

  const saldo = await tx.saldoCliente.upsert({
    where: { clienteId: entrada.clienteId },
    create: { clienteId: entrada.clienteId },
    update: {},
  });
  const anterior = Number(saldo.saldoActual);
  const despuesCargo = anterior + total;
  await tx.movimientoSaldo.create({
    data: {
      clienteId: entrada.clienteId,
      tipo: "CARGO_VENTA",
      monto: total,
      saldoAnterior: anterior,
      saldoNuevo: despuesCargo,
      referenciaId: venta.id,
      concepto: `Venta ${venta.folio}`,
    },
  });

  if (entrada.anticipo > 0) {
    const abono = await tx.abono.create({
      data: {
        clienteId: entrada.clienteId,
        ventaId: venta.id,
        usuarioId,
        monto: entrada.anticipo,
        metodo: entrada.metodoAnticipo,
        fechaAbono: entrada.fechaVenta,
        notas: "Anticipo de venta",
      },
    });
    await tx.movimientoSaldo.create({
      data: {
        clienteId: entrada.clienteId,
        tipo: "ABONO",
        monto: entrada.anticipo,
        saldoAnterior: despuesCargo,
        saldoNuevo: despuesCargo - entrada.anticipo,
        referenciaId: abono.id,
        concepto: `Anticipo ${venta.folio}`,
      },
    });
  }

  await tx.saldoCliente.update({
    where: { clienteId: entrada.clienteId },
    data: {
      saldoActual: anterior + financiado,
      totalCargos: { increment: total },
      totalAbonos: { increment: entrada.anticipo },
    },
  });
  if (financiado > 0 && entrada.numeroTarjeta) {
    await tx.cliente.update({
      where: { id: entrada.clienteId },
      data: { numeroTarjeta: entrada.numeroTarjeta },
    });
  }
}
