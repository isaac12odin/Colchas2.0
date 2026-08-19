import type { Prisma } from "@prisma/client";
import { ErrorAplicacion } from "../../compartido/errores.js";
import { fechaMexicoISO, fechaOperativa } from "../../compartido/fechas.js";

/**
 * Serializa todas las mutaciones monetarias de un operador/día con el cierre.
 * Si el movimiento gana el bloqueo, el corte lo incluye; si el corte gana, el
 * movimiento espera y después recibe JORNADA_CERRADA.
 */
export async function bloquearJornada(
  tx: Prisma.TransactionClient,
  usuarioOperadorId: string,
  fecha: string,
) {
  await tx.$queryRaw`
    SELECT 1::integer AS bloqueado
    FROM (
      SELECT pg_advisory_xact_lock(
        hashtext(${`nexo:corte:${usuarioOperadorId}:${fecha}`})
      )
    ) AS candado
  `;
}

/** Impide que una operación tardía modifique los importes de un corte firmado. */
export async function asegurarJornadaAbierta(
  tx: Prisma.TransactionClient,
  usuarioOperadorId: string,
  fechaMovimiento: Date,
) {
  const fecha = fechaMexicoISO(fechaMovimiento);
  await bloquearJornada(tx, usuarioOperadorId, fecha);
  const corte = await tx.corteCaja.findUnique({
    where: {
      usuarioOperadorId_fechaOperativa: {
        usuarioOperadorId,
        fechaOperativa: fechaOperativa(fecha),
      },
    },
    select: { folio: true },
  });
  if (corte)
    throw new ErrorAplicacion(
      "JORNADA_CERRADA",
      `La jornada ${fecha} ya fue firmada con el corte ${corte.folio}. Sincronice todo antes de cerrar.`,
      409,
    );
}
