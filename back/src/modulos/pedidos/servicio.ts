import { PeriodicidadPago, Prisma, TipoVenta } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../infraestructura/prisma.js";
import { ErrorAplicacion } from "../../compartido/errores.js";
import { dineroNoNegativo, dineroPositivo } from "../../compartido/dinero.js";
import {
  contextoFechaOperacion,
  validarFechaMonetaria,
  validarPrimerVencimiento,
} from "../../compartido/fechas.js";
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
  anticipo: dineroNoNegativo.default(0),
  metodoAnticipo: z
    .enum(["EFECTIVO", "TRANSFERENCIA", "TARJETA", "OTRO"])
    .default("EFECTIVO"),
  fechaEntrega: z.coerce.date().default(() => new Date()),
  plan: z
    .object({
      periodicidad: z.nativeEnum(PeriodicidadPago),
      montoCuota: dineroPositivo,
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
  const recibidaEnServidor = new Date();
  validarFechaMonetaria(
    datos.fechaEntrega,
    recibidaEnServidor,
    "La fecha de entrega",
  );
  if (datos.plan)
    validarPrimerVencimiento(datos.fechaEntrega, datos.plan.primerVencimiento);
  const pedido = await tx.pedidoVenta.findUniqueOrThrow({
    where: { id: pedidoId },
    include: { items: true, venta: true },
  });
  await asegurarClienteAsignado(tx, actor, pedido.clienteId);
  if (pedido.estado === "ENTREGADO" && pedido.venta) {
    if (datos.idOperacionMovil) {
      if (pedido.venta.idOperacionMovil !== datos.idOperacionMovil)
        throw new ErrorAplicacion(
          "PEDIDO_YA_ENTREGADO",
          `El pedido ya fue entregado en la venta ${pedido.venta.folio}. No se generó una segunda venta.`,
          409,
        );
      const reintento = await crearVentaEnTransaccion(
        tx,
        actor,
        construirEntradaVenta(pedido, datos),
        pedido.id,
      );
      return { pedidoId: pedido.id, venta: reintento, idempotente: true };
    }
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

  const itemsSinProveedor = await tx.itemPedidoVenta.count({
    where: { pedidoId: pedido.id, proveedorId: null },
  });
  if (itemsSinProveedor > 0)
    throw new ErrorAplicacion(
      "PROVEEDOR_REQUERIDO",
      "Administracion, Contabilidad o Almacen deben asignar quien surtira cada articulo antes de la entrega.",
      422,
    );

  const venta = await crearVentaEnTransaccion(
    tx,
    actor,
    construirEntradaVenta(pedido, datos),
    pedido.id,
  );
  const contextoFecha = contextoFechaOperacion(
    datos.fechaEntrega,
    recibidaEnServidor,
  );
  await tx.pedidoVenta.update({
    where: { id: pedido.id },
    data: {
      estado: "ENTREGADO",
      entregadoEn: datos.fechaEntrega,
      fechaOperativaEntrega: contextoFecha.fechaOperativa,
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

function construirEntradaVenta(
  pedido: {
    id: string;
    folio: string;
    clienteId: string;
    items: Array<{
      productoId: string | null;
      cantidad: number;
      precioEstimado: Prisma.Decimal;
    }>;
  },
  datos: EntregaPedido,
) {
  return {
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
  };
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
