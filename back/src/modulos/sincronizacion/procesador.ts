import { Prisma } from "@prisma/client";

import { descifrarCampo } from "../../compartido/cifrado.js";
import { ErrorAplicacion } from "../../compartido/errores.js";
import { prisma } from "../../infraestructura/prisma.js";
import {
  asegurarClienteAsignado,
  asegurarRutaAsignada,
  type ActorDatos,
} from "../../seguridad/alcanceDatos.js";
import { registrarAbonoEnTransaccion } from "../cobranza/servicio.js";
import { entregarPedidoEnTransaccion } from "../pedidos/servicio.js";
import { esVisitaFueraDeRuta } from "../rutas/reglas.js";
import { crearVentaEnTransaccion } from "../ventas/servicio.js";
import type {
  LoteSincronizacionEntrada,
  OperacionSincronizacion,
} from "./esquemas.js";
import {
  calcularHashOperacion,
  calcularHuellaLote,
  hashesIguales,
  reciboCoincide,
} from "./integridad.js";

export interface ResultadoOperacion {
  idOperacion: string;
  exito: boolean;
  entidadId?: string;
  codigoError?: string;
  error?: string;
  rechazoPermanente?: boolean;
  idempotente: boolean;
}

/**
 * Valida el lote y avanza su cadena en una sola transacción. Cada operación
 * tiene un SAVEPOINT: un rechazo de negocio queda como recibo terminal y no
 * bloquea las operaciones posteriores; un error técnico inesperado revierte
 * todo para que sea seguro reintentar.
 */
export function sincronizarLote(
  lote: LoteSincronizacionEntrada,
  actor: ActorDatos,
) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`
        SELECT 1::integer AS bloqueado
        FROM (
          SELECT pg_advisory_xact_lock(
            hashtext(${`nexo:dispositivo:${actor.id}:${lote.dispositivoId}`})
          )
        ) AS candado
      `;
      const dispositivo = await tx.dispositivoSincronizacion.findUnique({
        where: {
          usuarioId_dispositivoId: {
            usuarioId: actor.id,
            dispositivoId: lote.dispositivoId,
          },
        },
      });
      if (!dispositivo || !dispositivo.activo)
        throw new ErrorAplicacion(
          "DISPOSITIVO_NO_AUTORIZADO",
          "Registre o reactive este equipo antes de sincronizar.",
          403,
        );

      const clave = descifrarCampo(dispositivo.claveIntegridadCifrada);
      if (
        !hashesIguales(
          calcularHuellaLote(clave, lote.operaciones),
          lote.huellaIntegridad,
        )
      )
        throw new ErrorAplicacion(
          "HUELLA_LOTE_INVALIDA",
          "La huella criptográfica del lote no coincide con sus operaciones.",
          409,
        );

      const recibos = await tx.operacionSincronizada.findMany({
        where: {
          idOperacion: {
            in: lote.operaciones.map((operacion) => operacion.idOperacion),
          },
        },
      });
      if (recibos.length) {
        if (recibos.length !== lote.operaciones.length)
          throw new ErrorAplicacion(
            "LOTE_PARCIAL_REUTILIZADO",
            "El lote mezcla operaciones nuevas con recibos anteriores.",
            409,
          );
        const resultados = lote.operaciones.map((operacion) => {
          const recibo = recibos.find(
            (actual) => actual.idOperacion === operacion.idOperacion,
          );
          if (
            !recibo ||
            !reciboCoincide(recibo, operacion, actor.id, lote.dispositivoId)
          )
            throw new ErrorAplicacion(
              "OPERACION_NO_COINCIDE",
              "Una operación ya existe con otro propietario o contenido.",
              409,
            );
          return {
            idOperacion: operacion.idOperacion,
            exito: recibo.estado === "CONFIRMADA",
            entidadId: recibo.entidadId ?? undefined,
            codigoError: recibo.codigoError ?? undefined,
            error: recibo.mensajeError ?? undefined,
            rechazoPermanente: recibo.estado === "RECHAZADA" || undefined,
            idempotente: true,
          };
        });
        const loteIdsOriginales = [
          ...new Set(recibos.map((recibo) => recibo.loteId)),
        ];
        if (loteIdsOriginales.length !== 1)
          throw new ErrorAplicacion(
            "RECIBOS_INCONSISTENTES",
            "Las operaciones recibidas no pertenecen a un único lote original.",
            409,
          );
        const registro = await obtenerLoteIdempotente(
          tx,
          lote,
          actor.id,
          loteIdsOriginales[0]!,
        );
        return { idempotente: true, lote: registro, resultados };
      }

      validarCadena(lote, actor.id, clave, {
        secuencia: dispositivo.ultimaSecuencia,
        hash: dispositivo.ultimoHash,
      });
      const registro = await crearLote(tx, lote, actor.id);
      const resultados: ResultadoOperacion[] = [];
      for (const operacion of lote.operaciones) {
        await tx.$executeRawUnsafe("SAVEPOINT nexo_operacion_offline");
        try {
          const entidadId = await procesarOperacion(tx, operacion, actor);
          await guardarRecibo(
            tx,
            registro.id,
            lote.dispositivoId,
            actor.id,
            operacion,
            {
              estado: "CONFIRMADA",
              entidadId,
            },
          );
          resultados.push({
            idOperacion: operacion.idOperacion,
            exito: true,
            entidadId,
            idempotente: false,
          });
        } catch (error) {
          await tx.$executeRawUnsafe(
            "ROLLBACK TO SAVEPOINT nexo_operacion_offline",
          );
          if (!(error instanceof ErrorAplicacion)) throw error;
          await guardarRecibo(
            tx,
            registro.id,
            lote.dispositivoId,
            actor.id,
            operacion,
            {
              estado: "RECHAZADA",
              codigoError: error.codigo,
              mensajeError: error.message,
            },
          );
          resultados.push({
            idOperacion: operacion.idOperacion,
            exito: false,
            codigoError: error.codigo,
            error: error.message,
            rechazoPermanente: true,
            idempotente: false,
          });
        } finally {
          await tx.$executeRawUnsafe(
            "RELEASE SAVEPOINT nexo_operacion_offline",
          );
        }
      }
      const ultima = lote.operaciones.at(-1)!;
      await tx.dispositivoSincronizacion.update({
        where: { id: dispositivo.id },
        data: {
          ultimaSecuencia: ultima.secuencia,
          ultimoHash: ultima.hashIntegridad,
          ultimoUsoEn: new Date(),
        },
      });
      const actualizado = await tx.loteSincronizacion.update({
        where: { id: registro.id },
        data: {
          totalOperaciones: resultados.length,
          exitosas: resultados.filter((resultado) => resultado.exito).length,
          fallidas: resultados.filter((resultado) => !resultado.exito).length,
          detalleError: resultados
            .filter((resultado) => !resultado.exito)
            .map((resultado) => ({
              idOperacion: resultado.idOperacion,
              codigo: resultado.codigoError,
              mensaje: resultado.error,
            })),
        },
      });
      return {
        idempotente: false,
        lote: actualizado,
        resultados,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
  );
}

async function guardarRecibo(
  tx: Prisma.TransactionClient,
  loteId: string,
  dispositivoId: string,
  usuarioId: string,
  operacion: OperacionSincronizacion,
  resultado: {
    estado: "CONFIRMADA" | "RECHAZADA";
    entidadId?: string;
    codigoError?: string;
    mensajeError?: string;
  },
) {
  await tx.operacionSincronizada.create({
    data: {
      idOperacion: operacion.idOperacion,
      loteId,
      usuarioId,
      dispositivoId,
      tipo: operacion.tipo,
      entidadId: resultado.entidadId,
      estado: resultado.estado,
      codigoError: resultado.codigoError,
      mensajeError: resultado.mensajeError,
      requiereRevision: resultado.estado === "RECHAZADA",
      secuencia: operacion.secuencia,
      hashAnterior: operacion.hashAnterior,
      hashContenido: operacion.hashIntegridad,
      creadaEnCliente: operacion.creadoEn,
      diferenciaRelojSegundos: Math.round(
        (Date.now() - operacion.creadoEn.getTime()) / 1000,
      ),
    },
  });
}

function validarCadena(
  lote: LoteSincronizacionEntrada,
  usuarioId: string,
  clave: string,
  ancla: { secuencia: number; hash: string },
) {
  let secuencia = ancla.secuencia;
  let hashAnterior = ancla.hash;
  for (const operacion of lote.operaciones) {
    if (
      operacion.secuencia !== secuencia + 1 ||
      operacion.hashAnterior !== hashAnterior
    )
      throw new ErrorAplicacion(
        "CADENA_OFFLINE_DISCONTINUA",
        "La secuencia no continúa desde el último registro aceptado por el servidor.",
        409,
      );
    const esperado = calcularHashOperacion(clave, usuarioId, operacion);
    if (!hashesIguales(esperado, operacion.hashIntegridad))
      throw new ErrorAplicacion(
        "OPERACION_OFFLINE_MANIPULADA",
        "Una operación no superó la validación criptográfica del servidor.",
        409,
      );
    secuencia = operacion.secuencia;
    hashAnterior = operacion.hashIntegridad;
  }
}

async function crearLote(
  tx: Prisma.TransactionClient,
  lote: LoteSincronizacionEntrada,
  usuarioId: string,
) {
  const existente = await tx.loteSincronizacion.findUnique({
    where: { idLoteCliente: lote.idLoteCliente },
  });
  if (existente)
    throw new ErrorAplicacion(
      "LOTE_REUTILIZADO",
      "El identificador del lote ya fue utilizado con otro contenido.",
      409,
    );
  return tx.loteSincronizacion.create({
    data: {
      idLoteCliente: lote.idLoteCliente,
      dispositivoId: lote.dispositivoId,
      usuarioId,
      totalOperaciones: lote.operaciones.length,
      exitosas: 0,
      fallidas: 0,
      huellaIntegridad: lote.huellaIntegridad,
    },
  });
}

async function obtenerLoteIdempotente(
  tx: Prisma.TransactionClient,
  lote: LoteSincronizacionEntrada,
  usuarioId: string,
  loteIdOriginal: string,
) {
  const [existente, identificadorEnUso] = await Promise.all([
    tx.loteSincronizacion.findUnique({ where: { id: loteIdOriginal } }),
    tx.loteSincronizacion.findUnique({
      where: { idLoteCliente: lote.idLoteCliente },
    }),
  ]);
  if (identificadorEnUso && identificadorEnUso.id !== loteIdOriginal)
    throw new ErrorAplicacion(
      "LOTE_REUTILIZADO",
      "El identificador del reintento pertenece a otro lote.",
      409,
    );
  if (
    !existente ||
    existente.usuarioId !== usuarioId ||
    existente.dispositivoId !== lote.dispositivoId ||
    !existente.huellaIntegridad ||
    !hashesIguales(existente.huellaIntegridad, lote.huellaIntegridad)
  )
    throw new ErrorAplicacion(
      "LOTE_NO_COINCIDE",
      "El lote idempotente no coincide con el usuario, equipo o contenido.",
      409,
    );
  return existente;
}

async function procesarOperacion(
  tx: Prisma.TransactionClient,
  operacion: OperacionSincronizacion,
  actor: ActorDatos,
) {
  if (operacion.tipo === "VISITA") {
    if (
      operacion.datos.promesaPagoFecha &&
      operacion.datos.promesaPagoFecha < operacion.datos.fechaVisita
    )
      throw new ErrorAplicacion(
        "PROMESA_PAGO_INVALIDA",
        "La promesa de pago no puede ser anterior a la visita.",
        422,
      );
    await asegurarRutaAsignada(tx, actor, operacion.datos.rutaId);
    await asegurarClienteAsignado(tx, actor, operacion.datos.clienteId);
    const asignacion = await tx.rutaCliente.findUnique({
      where: {
        rutaId_clienteId: {
          rutaId: operacion.datos.rutaId,
          clienteId: operacion.datos.clienteId,
        },
      },
      select: { activo: true },
    });
    const fueraDeRuta = esVisitaFueraDeRuta(asignacion);
    const visita = await tx.visitaCobranza.upsert({
      where: {
        rutaId_clienteId_fechaProgramada: {
          rutaId: operacion.datos.rutaId,
          clienteId: operacion.datos.clienteId,
          fechaProgramada: operacion.datos.fechaProgramada,
        },
      },
      update: {
        ...operacion.datos,
        fueraDeRuta,
        idOperacionMovil: operacion.idOperacion,
        usuarioId: actor.id,
      },
      create: {
        ...operacion.datos,
        fueraDeRuta,
        idOperacionMovil: operacion.idOperacion,
        usuarioId: actor.id,
      },
    });
    if (fueraDeRuta)
      await tx.auditoria.create({
        data: {
          usuarioId: actor.id,
          accion: "CREAR",
          entidad: "VisitaFueraDeRuta",
          entidadId: visita.id,
          datosDespues: {
            rutaId: operacion.datos.rutaId,
            clienteId: operacion.datos.clienteId,
          },
        },
      });
    return visita.id;
  }
  if (operacion.tipo === "ABONO") {
    const visitaId = operacion.visitaOperacionId
      ? (
          await tx.visitaCobranza.findUnique({
            where: { idOperacionMovil: operacion.visitaOperacionId },
          })
        )?.id
      : undefined;
    if (operacion.visitaOperacionId && !visitaId)
      throw new ErrorAplicacion(
        "DEPENDENCIA_OFFLINE_NO_CONFIRMADA",
        "El abono depende de una visita que no fue confirmada. Corrija primero la visita y capture una operación compensatoria.",
        409,
      );
    return (
      await registrarAbonoEnTransaccion(tx, actor, {
        ...operacion.datos,
        idOperacionMovil: operacion.idOperacion,
        visitaId,
      })
    ).id;
  }
  if (operacion.tipo === "VENTA")
    return (
      await crearVentaEnTransaccion(tx, actor, {
        ...operacion.datos,
        idOperacionMovil: operacion.idOperacion,
      })
    ).id;
  return (
    await entregarPedidoEnTransaccion(tx, actor, operacion.datos.pedidoId, {
      ...operacion.datos,
      idOperacionMovil: operacion.idOperacion,
    })
  ).venta.id;
}
