import { Prisma, RolUsuario, TipoVenta } from "@prisma/client";
import { prisma } from "../../infraestructura/prisma.js";
import { ErrorAplicacion } from "../../compartido/errores.js";
import { generarCuotas } from "./calculos.js";
import { type NuevaVenta } from "./esquemas.js";
import {
  registrarSalidasVenta,
  reservarInventarioVenta,
} from "./inventarioVenta.js";
import { registrarSaldoVenta } from "./saldoVenta.js";
import { faltaTarjetaParaCredito } from "./reglas.js";
import { asegurarJornadaAbierta } from "../cortes/integridad.js";
import {
  asegurarClienteAsignado,
  bloquearCliente,
  type ActorDatos,
} from "../../seguridad/alcanceDatos.js";

export { esquemaNuevaVenta, type NuevaVenta } from "./esquemas.js";

export async function crearVentaEnTransaccion(
  tx: Prisma.TransactionClient,
  actor: ActorDatos,
  entrada: NuevaVenta,
  pedidoId?: string,
) {
  if (entrada.idOperacionMovil) {
    const existente = await tx.venta.findUnique({
      where: { idOperacionMovil: entrada.idOperacionMovil },
      include: {
        detalles: { include: { producto: true } },
        planPago: { include: { cuotas: true } },
      },
    });
    if (existente) return { ...existente, idempotente: true };
  }
  await asegurarJornadaAbierta(tx, actor.id, entrada.fechaVenta);
  const ids = [...new Set(entrada.items.map((item) => item.productoId))];
  if (ids.length !== entrada.items.length)
    throw new ErrorAplicacion(
      "PRODUCTO_REPETIDO",
      "Agrupe el mismo producto en una sola linea.",
      422,
    );

  const productos = await tx.producto.findMany({
    where: { id: { in: ids }, activo: true },
  });
  if (productos.length !== ids.length)
    throw new ErrorAplicacion(
      "PRODUCTO_INVALIDO",
      "Un producto no existe o esta inactivo.",
      422,
    );

  if (entrada.tipo === "CREDITO" && !entrada.clienteId) {
    throw new ErrorAplicacion(
      "CLIENTE_REQUERIDO",
      "Las ventas a credito requieren un cliente.",
      422,
    );
  }
  if (entrada.tipo !== "CREDITO" && entrada.plan) {
    throw new ErrorAplicacion(
      "PLAN_NO_PERMITIDO",
      "Solo las ventas a credito pueden tener plan de pagos.",
      422,
    );
  }
  if (entrada.clienteId) {
    await asegurarClienteAsignado(tx, actor, entrada.clienteId);
    await bloquearCliente(tx, entrada.clienteId);
  }

  const detalles = entrada.items.map((item) => {
    const producto = productos.find((valor) => valor.id === item.productoId)!;
    const precioCatalogo = Number(producto.precioVenta);
    const precioUnitario = item.precioUnitario ?? precioCatalogo;
    const cambiaPrecio = Math.abs(precioUnitario - precioCatalogo) >= 0.005;
    if (cambiaPrecio && !pedidoId && actor.rol !== RolUsuario.ADMINISTRADOR) {
      throw new ErrorAplicacion(
        "PRECIO_NO_AUTORIZADO",
        "El precio lo determina el catálogo. Sólo un administrador puede autorizar una excepción.",
        403,
      );
    }
    if (precioUnitario < Number(producto.precioCompra)) {
      throw new ErrorAplicacion(
        "PRECIO_BAJO_COSTO",
        "El precio autorizado no puede ser menor al costo registrado.",
        422,
      );
    }
    return {
      productoId: item.productoId,
      productoNombre: producto.nombre,
      productoSku: producto.sku,
      productoMarca: producto.marca,
      cantidad: item.cantidad,
      precioUnitario,
      costoUnitario: producto.precioCompra,
      descuento: 0,
      total: precioUnitario * item.cantidad,
      producto,
    };
  });
  const subtotal = detalles.reduce(
    (suma, detalle) => suma + Number(detalle.total),
    0,
  );
  if (entrada.descuento > subtotal)
    throw new ErrorAplicacion(
      "DESCUENTO_INVALIDO",
      "El descuento supera el subtotal.",
      422,
    );
  if (entrada.descuento > 0 && actor.rol !== RolUsuario.ADMINISTRADOR)
    throw new ErrorAplicacion(
      "DESCUENTO_NO_AUTORIZADO",
      "Sólo un administrador puede autorizar descuentos.",
      403,
    );
  const total = subtotal - entrada.descuento;
  const costoTotal = detalles.reduce(
    (suma, detalle) =>
      suma + detalle.cantidad * Number(detalle.costoUnitario),
    0,
  );
  if (total < costoTotal)
    throw new ErrorAplicacion(
      "VENTA_BAJO_COSTO",
      "El descuento no puede dejar la venta por debajo del costo total.",
      422,
    );
  if (entrada.anticipo > total)
    throw new ErrorAplicacion(
      "ANTICIPO_INVALIDO",
      "El anticipo supera el total.",
      422,
    );
  const financiado = entrada.tipo === "CREDITO" ? total - entrada.anticipo : 0;
  if (financiado > 0 && !entrada.plan)
    throw new ErrorAplicacion(
      "PLAN_REQUERIDO",
      "Defina la cuota y periodicidad del credito.",
      422,
    );

  if (entrada.clienteId) {
    const cliente = await tx.cliente.findUnique({
      where: { id: entrada.clienteId },
      include: { saldo: true },
    });
    if (!cliente || !cliente.activo)
      throw new ErrorAplicacion(
        "CLIENTE_INVALIDO",
        "El cliente no existe o esta inactivo.",
        422,
      );
    if (
      faltaTarjetaParaCredito({
        tipo: entrada.tipo,
        financiado,
        tarjetaActual: cliente.numeroTarjeta,
        tarjetaPropuesta: entrada.numeroTarjeta,
      })
    ) {
      throw new ErrorAplicacion(
        "TARJETA_REQUERIDA",
        "Escriba el número de tarjeta que desea asignar al cliente.",
        422,
      );
    }
    if (
      entrada.tipo === "CREDITO" &&
      Number(cliente.limiteCredito) > 0 &&
      Number(cliente.saldo?.saldoActual ?? 0) + financiado >
        Number(cliente.limiteCredito)
    ) {
      throw new ErrorAplicacion(
        "LIMITE_CREDITO",
        "La venta supera el limite de credito del cliente.",
        422,
      );
    }
  }

  await reservarInventarioVenta(tx, detalles);

  const cuotas = generarCuotas(financiado, entrada.plan);

  const venta = await tx.venta.create({
    data: {
      folio: `V-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      idOperacionMovil: entrada.idOperacionMovil,
      clienteId: entrada.clienteId,
      usuarioId: actor.id,
      tipo: entrada.tipo,
      estado: "CONFIRMADA",
      subtotal,
      descuento: entrada.descuento,
      total,
      anticipo: entrada.anticipo,
      metodoPago: entrada.metodoAnticipo,
      fechaVenta: entrada.fechaVenta,
      confirmadaEn: new Date(),
      notas: entrada.notas,
      detalles: {
        create: detalles.map(({ producto, ...detalle }) => detalle),
      },
      ...(cuotas.length && entrada.plan
        ? {
            planPago: {
              create: {
                periodicidad: entrada.plan.periodicidad,
                numeroCuotas: cuotas.length,
                montoCuota: entrada.plan.montoCuota,
                primerVencimiento: entrada.plan.primerVencimiento,
                cuotas: { create: cuotas },
              },
            },
          }
        : {}),
      ...(pedidoId ? { pedido: { connect: { id: pedidoId } } } : {}),
    },
    include: {
      detalles: { include: { producto: true } },
      planPago: { include: { cuotas: true } },
    },
  });

  await registrarSalidasVenta(tx, detalles, venta.id, actor.id);
  await registrarSaldoVenta(tx, entrada, venta, actor.id, total, financiado);

  await tx.auditoria.create({
    data: {
      usuarioId: actor.id,
      accion: "CREAR",
      entidad: "Venta",
      entidadId: venta.id,
      datosDespues: {
        folio: venta.folio,
        tipo: venta.tipo,
        total: Number(venta.total),
        origen: entrada.idOperacionMovil ? "MOVIL_OFFLINE" : "EN_LINEA",
      },
    },
  });

  return { ...venta, idempotente: false };
}

export async function crearVenta(
  actor: ActorDatos,
  entrada: NuevaVenta,
  pedidoId?: string,
) {
  // PostgreSQL puede abortar legítimamente una de dos transacciones
  // serializables que intentan vender el mismo inventario. Reintentamos para
  // que la operación perdedora se evalúe contra el stock ya confirmado y
  // responda con una regla de negocio (409), nunca con un 500 accidental.
  for (let intento = 1; intento <= 3; intento += 1) {
    try {
      return await prisma.$transaction(
        (tx) => crearVentaEnTransaccion(tx, actor, entrada, pedidoId),
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
      );
    } catch (error) {
      const conflictoSerializable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034";
      if (!conflictoSerializable) throw error;
      if (intento === 3)
        throw new ErrorAplicacion(
          "OPERACION_CONCURRENTE",
          "El inventario cambio durante la venta. Revise existencias e intente nuevamente.",
          409,
        );
    }
  }
  throw new ErrorAplicacion(
    "OPERACION_CONCURRENTE",
    "No fue posible confirmar la venta por actividad simultanea.",
    409,
  );
}
