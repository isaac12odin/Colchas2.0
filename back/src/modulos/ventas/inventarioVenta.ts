import { Prisma } from "@prisma/client";

import { ErrorAplicacion } from "../../compartido/errores.js";

export interface DetalleVentaPreparado {
  productoId: string;
  cantidad: number;
  producto: { nombre: string };
}

/** Reserva stock con una actualización condicional para evitar sobreventa concurrente. */
export async function reservarInventarioVenta(
  tx: Prisma.TransactionClient,
  detalles: DetalleVentaPreparado[],
) {
  for (const detalle of detalles) {
    const actualizado = await tx.producto.updateMany({
      where: { id: detalle.productoId, existencia: { gte: detalle.cantidad } },
      data: { existencia: { decrement: detalle.cantidad } },
    });
    if (actualizado.count !== 1) {
      throw new ErrorAplicacion(
        "STOCK_INSUFICIENTE",
        `No hay existencia suficiente de ${detalle.producto.nombre}.`,
        409,
      );
    }
  }
}

export async function registrarSalidasVenta(
  tx: Prisma.TransactionClient,
  detalles: DetalleVentaPreparado[],
  ventaId: string,
  usuarioId: string,
) {
  for (const detalle of detalles) {
    const actualizado = await tx.producto.findUniqueOrThrow({
      where: { id: detalle.productoId },
    });
    await tx.movimientoInventario.create({
      data: {
        productoId: detalle.productoId,
        usuarioId,
        tipo: "SALIDA_VENTA",
        cantidad: detalle.cantidad,
        existenciaAntes: actualizado.existencia + detalle.cantidad,
        existenciaDespues: actualizado.existencia,
        referenciaTipo: "VENTA",
        referenciaId: ventaId,
      },
    });
  }
}
