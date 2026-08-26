import { Prisma, MetodoPago } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../infraestructura/prisma.js";
import { ErrorAplicacion } from "../../compartido/errores.js";
import { dineroPositivo } from "../../compartido/dinero.js";
import { recalcularRiesgoCliente } from "./riesgo.js";
import {
  contextoFechaOperacion,
  fechaISODesdeDateDb,
  requiereAlertaReloj,
  validarFechaMonetaria,
} from "../../compartido/fechas.js";
import { huellaIdempotencia } from "../../compartido/idempotencia.js";
import {
  asegurarJornadaAbierta,
  bloquearJornada,
} from "../cortes/integridad.js";
import {
  asegurarClienteAsignado,
  bloquearCliente,
  type ActorDatos,
} from "../../seguridad/alcanceDatos.js";

export const esquemaAbono = z.object({
  clienteId: z.string().uuid(),
  ventaId: z.string().uuid().nullable().optional(),
  visitaId: z.string().uuid().nullable().optional(),
  idOperacionMovil: z.string().trim().min(8).max(100).optional(),
  monto: dineroPositivo,
  metodo: z.nativeEnum(MetodoPago).default("EFECTIVO"),
  fechaAbono: z.coerce.date().default(() => new Date()),
  referencia: z.string().trim().max(120).optional(),
  notas: z.string().trim().max(1000).optional(),
});

export type NuevoAbono = z.infer<typeof esquemaAbono>;

export function calcularHuellaAbono(actor: ActorDatos, datos: NuevoAbono) {
  return huellaIdempotencia({
    version: 1,
    actorId: actor.id,
    clienteId: datos.clienteId,
    ventaId: datos.ventaId ?? null,
    visitaId: datos.visitaId ?? null,
    monto: datos.monto,
    metodo: datos.metodo,
    fechaAbono: datos.fechaAbono,
    referencia: datos.referencia ?? null,
    notas: datos.notas ?? null,
  });
}

export async function registrarAbonoEnTransaccion(
  tx: Prisma.TransactionClient,
  actor: ActorDatos,
  datos: NuevoAbono,
) {
  const recibidaEnServidor = new Date();
  await asegurarClienteAsignado(tx, actor, datos.clienteId);
  if (datos.idOperacionMovil) {
    await tx.$queryRaw`
      SELECT 1::integer AS bloqueado
      FROM (
        SELECT pg_advisory_xact_lock(
          hashtext(${`nexo:idempotencia:${datos.idOperacionMovil}`})
        )
      ) AS candado
    `;
    const huellaOperacion = calcularHuellaAbono(actor, datos);
    const existente = await tx.abono.findUnique({
      where: { idOperacionMovil: datos.idOperacionMovil },
      include: { aplicaciones: true },
    });
    if (existente) {
      if (
        existente.usuarioId !== actor.id ||
        existente.huellaOperacion === null ||
        existente.huellaOperacion !== huellaOperacion
      )
        throw new ErrorAplicacion(
          "ID_OPERACION_REUTILIZADO",
          "La clave de este abono ya pertenece a otra operación.",
          409,
        );
      return { ...existente, idempotente: true };
    }
  }
  validarFechaMonetaria(
    datos.fechaAbono,
    recibidaEnServidor,
    "La fecha del abono",
  );
  const contextoFecha = contextoFechaOperacion(
    datos.fechaAbono,
    recibidaEnServidor,
  );
  await asegurarJornadaAbierta(tx, actor.id, recibidaEnServidor);
  await bloquearCliente(tx, datos.clienteId);

  const cliente = await tx.cliente.findUnique({
    where: { id: datos.clienteId },
    include: { saldo: true },
  });
  if (!cliente || !cliente.activo)
    throw new ErrorAplicacion(
      "CLIENTE_INVALIDO",
      "El cliente no existe o esta inactivo.",
      422,
    );
  const saldoAnterior = Number(cliente.saldo?.saldoActual ?? 0);
  if (datos.monto > saldoAnterior)
    throw new ErrorAplicacion(
      "ABONO_EXCEDENTE",
      "El abono no puede superar el saldo del cliente.",
      422,
    );

  if (datos.ventaId) {
    const venta = await tx.venta.findFirst({
      where: {
        id: datos.ventaId,
        clienteId: datos.clienteId,
        estado: "CONFIRMADA",
      },
    });
    if (!venta)
      throw new ErrorAplicacion(
        "VENTA_INVALIDA",
        "La venta no corresponde al cliente.",
        422,
      );
  }

  const abono = await tx.abono.create({
    data: {
      ...datos,
      usuarioId: actor.id,
      huellaOperacion: datos.idOperacionMovil
        ? calcularHuellaAbono(actor, datos)
        : null,
      capturadaEnCliente: contextoFecha.capturadaEnCliente,
      recibidaEnServidor: contextoFecha.recibidaEnServidor,
      fechaOperativa: contextoFecha.fechaOperativa,
    },
  });
  const cuotas = await tx.cuota.findMany({
    where: {
      planPago: {
        venta: {
          clienteId: datos.clienteId,
          estado: "CONFIRMADA",
          ...(datos.ventaId ? { id: datos.ventaId } : {}),
        },
      },
      estado: { in: ["PENDIENTE", "PARCIAL", "VENCIDA"] },
    },
    orderBy: [{ fechaVence: "asc" }, { numero: "asc" }],
  });

  let restante = datos.monto;
  for (const cuota of cuotas) {
    if (restante <= 0) break;
    const pendiente = Number(cuota.monto) - Number(cuota.montoPagado);
    const aplicado = Math.min(restante, pendiente);
    const montoPagado = Number(cuota.montoPagado) + aplicado;
    await tx.aplicacionAbono.create({
      data: { abonoId: abono.id, cuotaId: cuota.id, monto: aplicado },
    });
    await tx.cuota.update({
      where: { id: cuota.id },
      data: {
        montoPagado,
        estado: montoPagado >= Number(cuota.monto) ? "PAGADA" : "PARCIAL",
        pagadaEn: montoPagado >= Number(cuota.monto) ? datos.fechaAbono : null,
      },
    });
    restante -= aplicado;
  }

  const saldoNuevo = Math.max(0, saldoAnterior - datos.monto);
  await tx.saldoCliente.upsert({
    where: { clienteId: datos.clienteId },
    create: {
      clienteId: datos.clienteId,
      saldoActual: saldoNuevo,
      totalAbonos: datos.monto,
    },
    update: {
      saldoActual: saldoNuevo,
      totalAbonos: { increment: datos.monto },
    },
  });
  await tx.movimientoSaldo.create({
    data: {
      clienteId: datos.clienteId,
      tipo: "ABONO",
      monto: datos.monto,
      saldoAnterior,
      saldoNuevo,
      referenciaId: abono.id,
      concepto: "Abono de cliente",
    },
  });
  if (saldoNuevo === 0)
    await tx.cliente.update({
      where: { id: datos.clienteId },
      data: { numeroTarjeta: null },
    });
  await recalcularRiesgoCliente(tx, datos.clienteId);
  if (
    datos.idOperacionMovil &&
    requiereAlertaReloj(contextoFecha.diferenciaRelojSegundos)
  ) {
    await tx.auditoria.create({
      data: {
        usuarioId: actor.id,
        accion: "DIFERENCIA_RELOJ_DISPOSITIVO",
        entidad: "Abono",
        entidadId: abono.id,
        datosDespues: {
          idOperacion: datos.idOperacionMovil,
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
      accion: "REGISTRAR_ABONO",
      entidad: "Abono",
      entidadId: abono.id,
      datosDespues: {
        clienteId: datos.clienteId,
        monto: datos.monto,
        saldoAnterior,
        saldoNuevo,
        origen: datos.idOperacionMovil
          ? "MOVIL_OFFLINE"
          : datos.visitaId
            ? "WEB_RUTA"
            : "WEB_DIRECTO",
      },
    },
  });
  return { ...abono, saldoAnterior, saldoNuevo, idempotente: false };
}

export async function registrarAbono(actor: ActorDatos, datos: NuevoAbono) {
  return prisma.$transaction(
    (tx) => registrarAbonoEnTransaccion(tx, actor, datos),
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    },
  );
}

export async function anularAbono(
  usuarioId: string,
  abonoId: string,
  motivo: string,
) {
  return prisma.$transaction(
    async (tx) => {
      const referencia = await tx.abono.findUnique({
        where: { id: abonoId },
        select: {
          id: true,
          clienteId: true,
          usuarioId: true,
          fechaAbono: true,
          fechaOperativa: true,
        },
      });
      if (!referencia)
        throw new ErrorAplicacion(
          "ABONO_NO_ENCONTRADO",
          "El abono no existe.",
          404,
        );
      await bloquearJornada(
        tx,
        referencia.usuarioId,
        fechaISODesdeDateDb(referencia.fechaOperativa),
      );
      await bloquearCliente(tx, referencia.clienteId);

      // Releer después de ambos candados evita trabajar con saldo, cuotas o
      // estado de anulación obsoletos.
      const abono = await tx.abono.findUnique({
        where: { id: abonoId },
        include: {
          cliente: { include: { saldo: true } },
          aplicaciones: { include: { cuota: true } },
        },
      });
      if (!abono)
        throw new ErrorAplicacion(
          "ABONO_NO_ENCONTRADO",
          "El abono no existe.",
          404,
        );
      if (abono.anuladoEn)
        throw new ErrorAplicacion(
          "ABONO_YA_ANULADO",
          "El abono ya se encuentra anulado.",
          409,
        );
      const corte = await tx.corteCaja.findUnique({
        where: {
          usuarioOperadorId_fechaOperativa: {
            usuarioOperadorId: abono.usuarioId,
            fechaOperativa: abono.fechaOperativa,
          },
        },
        select: { folio: true },
      });
      if (corte)
        throw new ErrorAplicacion(
          "CORTE_CERRADO",
          `El abono pertenece al corte firmado ${corte.folio}; registre una correccion contable autorizada.`,
          409,
        );

      const marcada = await tx.abono.updateMany({
        where: { id: abono.id, anuladoEn: null },
        data: {
          anuladoEn: new Date(),
          anuladoPorId: usuarioId,
          motivoAnulacion: motivo,
        },
      });
      if (marcada.count !== 1)
        throw new ErrorAplicacion(
          "ABONO_YA_ANULADO",
          "El abono ya se encuentra anulado.",
          409,
        );

      const saldoAnterior = Number(abono.cliente.saldo?.saldoActual ?? 0);
      const saldoNuevo = saldoAnterior + Number(abono.monto);
      for (const aplicacion of abono.aplicaciones) {
        const montoPagado = Math.max(
          0,
          Number(aplicacion.cuota.montoPagado) - Number(aplicacion.monto),
        );
        const estado =
          montoPagado > 0
            ? "PARCIAL"
            : aplicacion.cuota.fechaVence < new Date()
              ? "VENCIDA"
              : "PENDIENTE";
        await tx.cuota.update({
          where: { id: aplicacion.cuotaId },
          data: { montoPagado, estado, pagadaEn: null },
        });
      }
      const actualizado = await tx.abono.findUniqueOrThrow({
        where: { id: abono.id },
      });
      await tx.saldoCliente.upsert({
        where: { clienteId: abono.clienteId },
        create: { clienteId: abono.clienteId, saldoActual: saldoNuevo },
        update: {
          saldoActual: saldoNuevo,
          totalAbonos: { decrement: abono.monto },
        },
      });
      await tx.movimientoSaldo.create({
        data: {
          clienteId: abono.clienteId,
          tipo: "AJUSTE_CARGO",
          monto: abono.monto,
          saldoAnterior,
          saldoNuevo,
          referenciaId: abono.id,
          concepto: `Anulacion de abono: ${motivo}`,
        },
      });
      await recalcularRiesgoCliente(tx, abono.clienteId);
      await tx.auditoria.create({
        data: {
          usuarioId,
          accion: "ANULAR",
          entidad: "Abono",
          entidadId: abono.id,
          datosAntes: {
            monto: Number(abono.monto),
            saldo: saldoAnterior,
            anulado: false,
          },
          datosDespues: { saldo: saldoNuevo, anulado: true, motivo },
        },
      });
      return { ...actualizado, saldoAnterior, saldoNuevo };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
  );
}
