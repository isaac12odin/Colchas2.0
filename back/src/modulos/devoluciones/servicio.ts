import { createHash } from "node:crypto";
import { MetodoPago, Prisma, RolUsuario, TipoDevolucion } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../infraestructura/prisma.js";
import { ErrorAplicacion } from "../../compartido/errores.js";
import { recalcularRiesgoCliente } from "../cobranza/riesgo.js";
import { asegurarJornadaAbierta } from "../cortes/integridad.js";
import {
  bloquearCliente,
  bloquearVenta,
} from "../../seguridad/alcanceDatos.js";

const evidencia = z.object({
  nombre: z.string().trim().min(1).max(180),
  mime: z.enum(["image/jpeg", "image/png", "image/webp"]),
  base64: z.string().min(20).max(3_500_000),
});

export const esquemaDevolucion = z
  .object({
    ventaId: z.string().uuid(),
    tipo: z.nativeEnum(TipoDevolucion),
    motivo: z.string().trim().min(10).max(500),
    montoReembolsado: z.coerce.number().min(0),
    metodoReembolso: z.nativeEnum(MetodoPago).optional(),
    usuarioOperadorId: z.string().uuid().optional(),
    evidencia,
    items: z
      .array(
        z.object({
          detalleVentaId: z.string().uuid(),
          cantidad: z.coerce.number().int().positive(),
        }),
      )
      .min(1),
    reemplazos: z
      .array(
        z.object({
          productoId: z.string().uuid(),
          cantidad: z.coerce.number().int().positive(),
        }),
      )
      .optional(),
  })
  .superRefine((datos, contexto) => {
    if (datos.tipo === "CAMBIO" && !datos.reemplazos?.length)
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reemplazos"],
        message: "Un cambio requiere al menos un producto de reemplazo.",
      });
    if (datos.tipo !== "CAMBIO" && datos.reemplazos?.length)
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reemplazos"],
        message: "Los reemplazos solo aplican al tipo CAMBIO.",
      });
    if (datos.montoReembolsado > 0 && !datos.usuarioOperadorId)
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["usuarioOperadorId"],
        message: "Indique qué operador de caja entregará el reembolso.",
      });
  });

export function calcularAplicacionDevolucion(
  totalDevuelto: number,
  saldoCliente: number,
  pendienteVenta: number,
) {
  const aplicadoSaldo = Math.min(
    Math.max(0, totalDevuelto),
    Math.max(0, saldoCliente),
    Math.max(0, pendienteVenta),
  );
  return {
    aplicadoSaldo: Number(aplicadoSaldo.toFixed(2)),
    reembolso: Number((Math.max(0, totalDevuelto) - aplicadoSaldo).toFixed(2)),
  };
}

function decodificarEvidencia(datos: z.infer<typeof evidencia>) {
  const contenido = Buffer.from(datos.base64, "base64");
  if (contenido.length === 0 || contenido.length > 2_500_000)
    throw new ErrorAplicacion(
      "EVIDENCIA_INVALIDA",
      "La fotografia no puede superar 2.5 MB.",
      422,
    );
  const firma = contenido.subarray(0, 12).toString("hex");
  const valida =
    (datos.mime === "image/jpeg" && firma.startsWith("ffd8ff")) ||
    (datos.mime === "image/png" && firma.startsWith("89504e470d0a1a0a")) ||
    (datos.mime === "image/webp" &&
      contenido.subarray(0, 4).toString() === "RIFF" &&
      contenido.subarray(8, 12).toString() === "WEBP");
  if (!valida)
    throw new ErrorAplicacion(
      "EVIDENCIA_INVALIDA",
      "El contenido no corresponde a una imagen JPEG, PNG o WebP valida.",
      422,
    );
  return {
    contenido,
    hash: createHash("sha256").update(contenido).digest("hex"),
  };
}

async function reducirCuotas(
  tx: Prisma.TransactionClient,
  ventaId: string,
  monto: number,
) {
  if (monto <= 0) return;
  const cuotas = await tx.cuota.findMany({
    where: { planPago: { ventaId } },
    orderBy: [{ fechaVence: "desc" }, { numero: "desc" }],
  });
  let restante = monto;
  for (const cuota of cuotas) {
    if (restante <= 0) break;
    const pendiente = Math.max(
      0,
      Number(cuota.monto) - Number(cuota.montoPagado),
    );
    const reduccion = Math.min(restante, pendiente);
    if (reduccion <= 0) continue;
    const montoNuevo = Number(cuota.monto) - reduccion;
    if (montoNuevo <= 0) {
      // Las cuotas tienen una restricción SQL monto > 0. Si la devolución
      // absorbe por completo una cuota aún no pagada, se elimina en lugar de
      // conservar una fila inválida con monto cero.
      await tx.cuota.delete({ where: { id: cuota.id } });
      restante -= reduccion;
      continue;
    }
    const pagada = Number(cuota.montoPagado) >= montoNuevo;
    await tx.cuota.update({
      where: { id: cuota.id },
      data: {
        monto: montoNuevo,
        estado: pagada
          ? "PAGADA"
          : Number(cuota.montoPagado) > 0
            ? "PARCIAL"
            : "PENDIENTE",
        pagadaEn: pagada ? new Date() : null,
      },
    });
    restante -= reduccion;
  }
}

export async function registrarDevolucion(
  autorizadoPorId: string,
  entrada: z.infer<typeof esquemaDevolucion>,
) {
  const archivo = decodificarEvidencia(entrada.evidencia);
  return prisma.$transaction(
    async (tx) => {
      let usuarioOperadorId: string | null = null;
      if (entrada.montoReembolsado > 0) {
        const operador = await tx.usuario.findFirst({
          where: {
            id: entrada.usuarioOperadorId,
            activo: true,
            rol: {
              in: [RolUsuario.ADMINISTRADOR, RolUsuario.COBRADOR],
            },
          },
          select: { id: true },
        });
        if (!operador)
          throw new ErrorAplicacion(
            "OPERADOR_REEMBOLSO_INVALIDO",
            "Seleccione un administrador o cobrador activo que entregue el reembolso.",
            422,
          );
        usuarioOperadorId = operador.id;
        // Orden global para mutaciones monetarias: jornada, agregado y cliente.
        // Coincide con Cobranza y evita el ciclo jornada↔cliente entre abono y reembolso.
        await asegurarJornadaAbierta(tx, usuarioOperadorId, new Date());
      }

      await bloquearVenta(tx, entrada.ventaId);
      const referenciaVenta = await tx.venta.findUnique({
        where: { id: entrada.ventaId },
        select: { clienteId: true },
      });
      if (referenciaVenta?.clienteId)
        await bloquearCliente(tx, referenciaVenta.clienteId);

      // Esta lectura debe ocurrir después de los candados. Sus devoluciones y
      // saldo son la fotografía autoritativa para calcular cantidades y dinero.
      const venta = await tx.venta.findUnique({
        where: { id: entrada.ventaId },
        include: {
          detalles: true,
          pedido: true,
          planPago: true,
          cliente: { include: { saldo: true } },
          devoluciones: {
            where: { estado: "REGISTRADA" },
            include: { detalles: true },
          },
        },
      });
      if (!venta || venta.estado !== "CONFIRMADA")
        throw new ErrorAplicacion(
          "VENTA_NO_DEVOLVIBLE",
          "La venta no existe o ya fue cancelada.",
          422,
        );

      const ids = entrada.items.map((item) => item.detalleVentaId);
      if (new Set(ids).size !== ids.length)
        throw new ErrorAplicacion(
          "DETALLE_REPETIDO",
          "Agrupe el mismo producto en una sola linea.",
          422,
        );
      const preparados = entrada.items.map((item) => {
        const detalle = venta.detalles.find(
          (actual) => actual.id === item.detalleVentaId,
        );
        if (!detalle)
          throw new ErrorAplicacion(
            "DETALLE_INVALIDO",
            "Un producto no pertenece a la venta indicada.",
            422,
          );
        const devuelto = venta.devoluciones.reduce(
          (suma, devolucion) =>
            suma +
            devolucion.detalles
              .filter((actual) => actual.detalleVentaId === detalle.id)
              .reduce((parcial, actual) => parcial + actual.cantidad, 0),
          0,
        );
        if (item.cantidad > detalle.cantidad - devuelto)
          throw new ErrorAplicacion(
            "CANTIDAD_EXCEDENTE",
            `Solo quedan ${detalle.cantidad - devuelto} unidades devolvibles de ${detalle.productoNombre}.`,
            422,
          );
        return {
          ...item,
          productoId: detalle.productoId,
          productoNombre: detalle.productoNombre,
          precioUnitario: Number(detalle.precioUnitario),
          total: item.cantidad * Number(detalle.precioUnitario),
        };
      });

      const cantidadesFinales = new Map<string, number>();
      for (const detalle of venta.detalles) {
        const anterior = venta.devoluciones.reduce(
          (suma, devolucion) =>
            suma +
            devolucion.detalles
              .filter((actual) => actual.detalleVentaId === detalle.id)
              .reduce((parcial, actual) => parcial + actual.cantidad, 0),
          0,
        );
        const nueva =
          preparados.find((actual) => actual.detalleVentaId === detalle.id)
            ?.cantidad ?? 0;
        cantidadesFinales.set(detalle.id, anterior + nueva);
      }
      const devolucionTotal = venta.detalles.every(
        (detalle) => cantidadesFinales.get(detalle.id) === detalle.cantidad,
      );
      if (entrada.tipo === "TOTAL" && !devolucionTotal)
        throw new ErrorAplicacion(
          "DEVOLUCION_TOTAL_INCOMPLETA",
          "Una cancelacion total debe incluir toda la mercancia restante.",
          422,
        );

      const totalDevuelto = preparados.reduce(
        (suma, item) => suma + item.total,
        0,
      );
      const saldoAnterior = Number(venta.cliente?.saldo?.saldoActual ?? 0);
      const pendienteVenta = venta.planPago
        ? Number(
            await tx.cuota
              .aggregate({
                where: { planPago: { ventaId: venta.id } },
                _sum: { monto: true, montoPagado: true },
              })
              .then(
                (r) =>
                  Number(r._sum.monto ?? 0) - Number(r._sum.montoPagado ?? 0),
              ),
          )
        : 0;
      const { aplicadoSaldo, reembolso: reembolsoEsperado } =
        calcularAplicacionDevolucion(
          totalDevuelto,
          saldoAnterior,
          pendienteVenta,
        );
      if (Math.abs(entrada.montoReembolsado - reembolsoEsperado) > 0.009)
        throw new ErrorAplicacion(
          "REEMBOLSO_INCONSISTENTE",
          `Debe registrar un reembolso de ${reembolsoEsperado.toFixed(2)} para cuadrar la operacion.`,
          422,
        );
      if (reembolsoEsperado > 0 && !entrada.metodoReembolso)
        throw new ErrorAplicacion(
          "METODO_REEMBOLSO_REQUERIDO",
          "Indique como se entrego el reembolso.",
          422,
        );

      let pedidoReemplazo: { id: string; folio: string } | null = null;
      if (entrada.tipo === "CAMBIO") {
        if (!venta.clienteId)
          throw new ErrorAplicacion(
            "CLIENTE_REQUERIDO",
            "Un cambio con reemplazo requiere una venta asociada a cliente.",
            422,
          );
        const reemplazos = entrada.reemplazos ?? [];
        const idsReemplazo = [
          ...new Set(reemplazos.map((item) => item.productoId)),
        ];
        if (idsReemplazo.length !== reemplazos.length)
          throw new ErrorAplicacion(
            "PRODUCTO_REPETIDO",
            "Agrupe el mismo reemplazo en una sola linea.",
            422,
          );
        const productosReemplazo = await tx.producto.findMany({
          where: { id: { in: idsReemplazo }, activo: true },
        });
        if (productosReemplazo.length !== idsReemplazo.length)
          throw new ErrorAplicacion(
            "REEMPLAZO_INVALIDO",
            "Seleccione productos activos para el reemplazo.",
            422,
          );
        pedidoReemplazo = await tx.pedidoVenta.create({
          data: {
            folio: `P-CAMBIO-${Date.now().toString(36).toUpperCase()}`,
            clienteId: venta.clienteId,
            estado: "PENDIENTE_PEDIR",
            notas: `Reemplazo por cambio de la venta ${venta.folio}: ${entrada.motivo}`,
            items: {
              create: reemplazos.map((item) => {
                const producto = productosReemplazo.find(
                  (actual) => actual.id === item.productoId,
                )!;
                return {
                  productoId: producto.id,
                  descripcion: producto.nombre,
                  cantidad: item.cantidad,
                  precioEstimado: producto.precioVenta,
                };
              }),
            },
          },
          select: { id: true, folio: true },
        });
      }

      const devolucion = await tx.devolucion.create({
        data: {
          folio: `D-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
          ventaId: venta.id,
          pedidoId: pedidoReemplazo?.id ?? venta.pedido?.id,
          clienteId: venta.clienteId,
          autorizadoPorId,
          usuarioOperadorId,
          tipo: entrada.tipo,
          motivo: entrada.motivo,
          totalDevuelto,
          aplicadoSaldo,
          montoReembolsado: reembolsoEsperado,
          metodoReembolso: entrada.metodoReembolso,
          evidenciaContenido: archivo.contenido,
          evidenciaMime: entrada.evidencia.mime,
          evidenciaNombre: entrada.evidencia.nombre,
          evidenciaHash: archivo.hash,
          detalles: {
            create: preparados.map((item) => ({
              detalleVentaId: item.detalleVentaId,
              productoId: item.productoId,
              productoNombre: item.productoNombre,
              cantidad: item.cantidad,
              precioUnitario: item.precioUnitario,
              total: item.total,
            })),
          },
        },
        include: { detalles: true },
      });

      for (const item of preparados) {
        const producto = await tx.producto.update({
          where: { id: item.productoId },
          data: { existencia: { increment: item.cantidad } },
        });
        await tx.movimientoInventario.create({
          data: {
            productoId: item.productoId,
            usuarioId: autorizadoPorId,
            tipo: "ENTRADA_DEVOLUCION",
            cantidad: item.cantidad,
            existenciaAntes: producto.existencia - item.cantidad,
            existenciaDespues: producto.existencia,
            referenciaTipo: "DEVOLUCION",
            referenciaId: devolucion.id,
            notas: entrada.motivo,
          },
        });
      }

      if (venta.clienteId && aplicadoSaldo > 0) {
        const saldoNuevo = Math.max(0, saldoAnterior - aplicadoSaldo);
        await tx.saldoCliente.update({
          where: { clienteId: venta.clienteId },
          data: { saldoActual: saldoNuevo },
        });
        await tx.movimientoSaldo.create({
          data: {
            clienteId: venta.clienteId,
            tipo: "CANCELACION_VENTA",
            monto: aplicadoSaldo,
            saldoAnterior,
            saldoNuevo,
            referenciaId: devolucion.id,
            concepto: `Devolucion ${devolucion.folio} de ${venta.folio}`,
          },
        });
        await reducirCuotas(tx, venta.id, aplicadoSaldo);
        if (saldoNuevo === 0)
          await tx.cliente.update({
            where: { id: venta.clienteId },
            data: { numeroTarjeta: null },
          });
        await recalcularRiesgoCliente(tx, venta.clienteId);
      }

      if (devolucionTotal) {
        await tx.venta.update({
          where: { id: venta.id },
          data: { estado: "CANCELADA", canceladaEn: new Date() },
        });
        if (venta.pedido)
          await tx.pedidoVenta.update({
            where: { id: venta.pedido.id },
            data: { estado: "CANCELADO" },
          });
      }
      await tx.auditoria.create({
        data: {
          usuarioId: autorizadoPorId,
          accion: devolucionTotal ? "CANCELAR_VENTA" : "REGISTRAR_DEVOLUCION",
          entidad: "Devolucion",
          entidadId: devolucion.id,
          datosAntes: {
            ventaId: venta.id,
            estadoVenta: venta.estado,
            saldoAnterior,
          },
          datosDespues: {
            folio: devolucion.folio,
            totalDevuelto,
            aplicadoSaldo,
            reembolso: reembolsoEsperado,
            usuarioOperadorId,
            evidenciaHash: archivo.hash,
            pedidoReemplazo: pedidoReemplazo?.folio,
          },
        },
      });
      return devolucion;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
  );
}
