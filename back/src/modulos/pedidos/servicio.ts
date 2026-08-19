import { PeriodicidadPago, Prisma, TipoVenta } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../infraestructura/prisma.js";
import { ErrorAplicacion } from "../../compartido/errores.js";
import { crearVentaEnTransaccion } from "../ventas/servicio.js";
import {
  asegurarClienteAsignado,
  type ActorDatos,
} from "../../seguridad/alcanceDatos.js";

export const esquemaEntregaPedido = z.object({
  pedidoId: z.string().uuid().optional(),
  idOperacionMovil: z.string().trim().min(8).max(100).optional(),
  tipo: z.nativeEnum(TipoVenta).default("CREDITO"),
  numeroTarjeta: z.string().trim().min(3).max(30).optional(),
  anticipo: z.coerce.number().min(0).default(0),
  metodoAnticipo: z
    .enum(["EFECTIVO", "TRANSFERENCIA", "TARJETA", "OTRO"])
    .default("EFECTIVO"),
  fechaEntrega: z.coerce.date().default(new Date()),
  proveedores: z
    .array(
      z.object({
        itemPedidoId: z.string().uuid(),
        proveedorId: z.string().uuid(),
      }),
    )
    .optional(),
  plan: z
    .object({
      periodicidad: z.nativeEnum(PeriodicidadPago),
      montoCuota: z.coerce.number().positive(),
      primerVencimiento: z.coerce.date(),
    })
    .optional(),
});

export type EntregaPedido = z.infer<typeof esquemaEntregaPedido>;

export async function entregarPedidoEnTransaccion(
  tx: Prisma.TransactionClient,
  actor: ActorDatos,
  pedidoId: string,
  datos: EntregaPedido,
) {
  const pedido = await tx.pedidoVenta.findUniqueOrThrow({
    where: { id: pedidoId },
    include: { items: true, venta: true },
  });
  await asegurarClienteAsignado(tx, actor, pedido.clienteId);
  if (pedido.estado === "ENTREGADO" && pedido.venta) {
    return { pedidoId: pedido.id, venta: pedido.venta, idempotente: true };
  }
  if (!["RECIBIDO_ALMACEN", "LISTO_ENTREGA"].includes(pedido.estado)) {
    throw new ErrorAplicacion(
      "PEDIDO_NO_LISTO",
      "El pedido aun no esta listo para entrega.",
      422,
    );
  }
  if (pedido.items.some((item) => !item.productoId)) {
    throw new ErrorAplicacion(
      "PRODUCTO_FALTANTE",
      "Asigne un producto de inventario a cada articulo antes de entregar.",
      422,
    );
  }

  if (datos.proveedores?.length) {
    const mapa = new Map(
      datos.proveedores.map((item) => [item.itemPedidoId, item.proveedorId]),
    );
    const proveedores = [...new Set(datos.proveedores.map((item) => item.proveedorId))];
    const validos = await tx.proveedor.count({
      where: { id: { in: proveedores }, activo: true },
    });
    if (validos !== proveedores.length)
      throw new ErrorAplicacion(
        "PROVEEDOR_INVALIDO",
        "Seleccione proveedores activos para toda la mercancia.",
        422,
      );
    for (const item of pedido.items) {
      const proveedorId = mapa.get(item.id);
      if (proveedorId)
        await tx.itemPedidoVenta.update({
          where: { id: item.id },
          data: { proveedorId },
        });
    }
  }
  const itemsSinProveedor = await tx.itemPedidoVenta.count({
    where: { pedidoId: pedido.id, proveedorId: null },
  });
  if (itemsSinProveedor > 0)
    throw new ErrorAplicacion(
      "PROVEEDOR_REQUERIDO",
      "Antes de entregar indique quien surtio cada articulo.",
      422,
    );

  const venta = await crearVentaEnTransaccion(
    tx,
    actor,
    {
      idOperacionMovil: datos.idOperacionMovil,
      clienteId: pedido.clienteId,
      tipo: datos.tipo,
      numeroTarjeta: datos.numeroTarjeta,
      anticipo: datos.anticipo,
      metodoAnticipo: datos.metodoAnticipo,
      descuento: 0,
      fechaVenta: datos.fechaEntrega,
      notas: `Entrega del pedido ${pedido.folio}`,
      items: pedido.items.map((item) => ({
        productoId: item.productoId!,
        cantidad: item.cantidad,
        precioUnitario: Number(item.precioEstimado),
      })),
      plan: datos.plan,
    },
    pedido.id,
  );
  await tx.pedidoVenta.update({
    where: { id: pedido.id },
    data: {
      estado: "ENTREGADO",
      entregadoEn: datos.fechaEntrega,
      entregadoPorId: actor.id,
    },
  });
  await tx.auditoria.create({
    data: {
      usuarioId: actor.id,
      accion: "ENTREGAR",
      entidad: "PedidoVenta",
      entidadId: pedido.id,
      datosDespues: {
        ventaId: venta.id,
        origen: datos.idOperacionMovil ? "MOVIL_OFFLINE" : "EN_LINEA",
      },
    },
  });
  return { pedidoId: pedido.id, venta, idempotente: false };
}

export function entregarPedido(
  actor: ActorDatos,
  pedidoId: string,
  datos: EntregaPedido,
) {
  return prisma.$transaction(
    (tx) => entregarPedidoEnTransaccion(tx, actor, pedidoId, datos),
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    },
  );
}
