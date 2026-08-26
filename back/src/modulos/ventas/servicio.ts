import { Prisma, RolUsuario } from "@prisma/client";
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
import { redondearMoneda } from "../../compartido/dinero.js";
import {
  contextoFechaOperacion,
  requiereAlertaReloj,
  validarFechaMonetaria,
  validarPrimerVencimiento,
} from "../../compartido/fechas.js";
import { huellaIdempotencia } from "../../compartido/idempotencia.js";
import {
  asegurarClienteAsignado,
  bloquearCliente,
  type ActorDatos,
} from "../../seguridad/alcanceDatos.js";
import { resolverAcuerdoParaVenta } from "../cobranza/acuerdoPago.js";

export { esquemaNuevaVenta, type NuevaVenta } from "./esquemas.js";

export function calcularHuellaVenta(
  actor: ActorDatos,
  entrada: NuevaVenta,
  pedidoId?: string,
) {
  return huellaIdempotencia({
    version: 1,
    actorId: actor.id,
    pedidoId: pedidoId ?? null,
    clienteId: entrada.clienteId ?? null,
    numeroTarjeta: entrada.numeroTarjeta ?? null,
    tipo: entrada.tipo,
    descuento: entrada.descuento,
    anticipo: entrada.anticipo,
    metodoAnticipo: entrada.metodoAnticipo,
    fechaVenta: entrada.fechaVenta,
    notas: entrada.notas ?? null,
    items: [...entrada.items].sort((a, b) =>
      a.productoId.localeCompare(b.productoId),
    ),
    plan: entrada.plan ?? null,
  });
}

export async function crearVentaEnTransaccion(
  tx: Prisma.TransactionClient,
  actor: ActorDatos,
  entrada: NuevaVenta,
  pedidoId?: string,
) {
  const recibidaEnServidor = new Date();
  if (entrada.idOperacionMovil) {
    await tx.$queryRaw`
      SELECT 1::integer AS bloqueado
      FROM (
        SELECT pg_advisory_xact_lock(
          hashtext(${`nexo:idempotencia:${entrada.idOperacionMovil}`})
        )
      ) AS candado
    `;
    const huellaOperacion = calcularHuellaVenta(actor, entrada, pedidoId);
    const existente = await tx.venta.findUnique({
      where: { idOperacionMovil: entrada.idOperacionMovil },
      include: {
        detalles: { include: { producto: true } },
        planPago: { include: { cuotas: true } },
      },
    });
    if (existente) {
      const corresponde =
        existente.usuarioId === actor.id &&
        existente.huellaOperacion !== null &&
        existente.huellaOperacion === huellaOperacion;
      if (!corresponde)
        throw new ErrorAplicacion(
          "ID_OPERACION_REUTILIZADO",
          "La clave de esta venta ya pertenece a otra operación. Recargue el formulario.",
          409,
        );
      const cargoSaldo = existente.clienteId
        ? await tx.movimientoSaldo.findFirst({
            where: {
              clienteId: existente.clienteId,
              referenciaId: existente.id,
              tipo: "CARGO_VENTA",
            },
            select: { saldoAnterior: true, saldoNuevo: true, monto: true },
          })
        : null;
      const resumenSaldo = cargoSaldo
        ? {
            clienteId: existente.clienteId!,
            saldoAnterior: Number(cargoSaldo.saldoAnterior),
            cargoVenta: Number(cargoSaldo.monto),
            anticipo: Number(existente.anticipo),
            saldoNuevo: redondearMoneda(
              Number(cargoSaldo.saldoNuevo) - Number(existente.anticipo),
            ),
          }
        : null;
      return { ...existente, resumenSaldo, idempotente: true };
    }
  }
  validarFechaMonetaria(
    entrada.fechaVenta,
    recibidaEnServidor,
    "La fecha de venta",
  );
  if (entrada.plan)
    validarPrimerVencimiento(
      entrada.fechaVenta,
      entrada.plan.primerVencimiento,
    );
  const contextoFecha = contextoFechaOperacion(
    entrada.fechaVenta,
    recibidaEnServidor,
  );
  await asegurarJornadaAbierta(tx, actor.id, recibidaEnServidor);
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
  if (entrada.tipo !== "CREDITO" && entrada.anticipo !== 0) {
    throw new ErrorAplicacion(
      "ANTICIPO_NO_PERMITIDO",
      "Una venta de contado registra el total como pago, no como anticipo.",
      422,
    );
  }
  if (entrada.tipo === "PUBLICO" && entrada.clienteId) {
    throw new ErrorAplicacion(
      "CLIENTE_NO_PERMITIDO",
      "Una venta a público general no puede alterar el expediente de un cliente.",
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
      total: redondearMoneda(precioUnitario * item.cantidad),
      producto,
    };
  });
  const subtotal = redondearMoneda(
    detalles.reduce((suma, detalle) => suma + Number(detalle.total), 0),
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
  const total = redondearMoneda(subtotal - entrada.descuento);
  const costoTotal = redondearMoneda(
    detalles.reduce(
      (suma, detalle) =>
        suma + detalle.cantidad * Number(detalle.costoUnitario),
      0,
    ),
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
  const financiado =
    entrada.tipo === "CREDITO" ? redondearMoneda(total - entrada.anticipo) : 0;
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

  const acuerdoResuelto =
    financiado > 0 && entrada.clienteId && entrada.plan
      ? await resolverAcuerdoParaVenta(
          tx,
          entrada.clienteId,
          entrada.fechaVenta,
          entrada.plan,
        )
      : null;
  const planVenta = acuerdoResuelto?.plan ?? entrada.plan;
  const cuotas = generarCuotas(financiado, planVenta);

  const venta = await tx.venta.create({
    data: {
      folio: `V-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      idOperacionMovil: entrada.idOperacionMovil,
      huellaOperacion: entrada.idOperacionMovil
        ? calcularHuellaVenta(actor, entrada, pedidoId)
        : null,
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
      capturadaEnCliente: contextoFecha.capturadaEnCliente,
      recibidaEnServidor: contextoFecha.recibidaEnServidor,
      fechaOperativa: contextoFecha.fechaOperativa,
      confirmadaEn: new Date(),
      notas: entrada.notas,
      detalles: {
        create: detalles.map(({ producto, ...detalle }) => detalle),
      },
      ...(cuotas.length && planVenta
        ? {
            planPago: {
              create: {
                periodicidad: planVenta.periodicidad,
                numeroCuotas: cuotas.length,
                montoCuota: planVenta.montoCuota,
                primerVencimiento: planVenta.primerVencimiento,
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
  const resumenSaldo = await registrarSaldoVenta(
    tx,
    entrada,
    venta,
    actor.id,
    total,
    financiado,
  );

  if (
    entrada.idOperacionMovil &&
    requiereAlertaReloj(contextoFecha.diferenciaRelojSegundos)
  ) {
    await tx.auditoria.create({
      data: {
        usuarioId: actor.id,
        accion: "DIFERENCIA_RELOJ_DISPOSITIVO",
        entidad: "Venta",
        entidadId: venta.id,
        datosDespues: {
          idOperacion: entrada.idOperacionMovil,
          diferenciaRelojSegundos: contextoFecha.diferenciaRelojSegundos,
          capturadaEnCliente: contextoFecha.capturadaEnCliente,
          recibidaEnServidor: contextoFecha.recibidaEnServidor,
        },
      },
    });
  }

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
        origen: entrada.idOperacionMovil?.startsWith("web-")
          ? "WEB"
          : entrada.idOperacionMovil
            ? "MOVIL_OFFLINE"
            : "API",
      },
    },
  });

  return {
    ...venta,
    resumenSaldo,
    acuerdoPago: acuerdoResuelto
      ? {
          periodicidad: acuerdoResuelto.acuerdo.periodicidad,
          montoPeriodico: Number(acuerdoResuelto.acuerdo.montoPeriodico),
          respetado: acuerdoResuelto.respetado,
        }
      : null,
    idempotente: false,
  };
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
