import type { Request } from "express";
import { prisma } from "../infraestructura/prisma.js";

export async function auditar(
  req: Request,
  accion: string,
  entidad: string,
  entidadId?: string,
  datosAntes?: unknown,
  datosDespues?: unknown,
) {
  await prisma.auditoria.create({
    data: {
      usuarioId: req.usuario?.id,
      accion,
      entidad,
      entidadId,
      datosAntes: datosAntes as never,
      datosDespues: datosDespues as never,
      ip: req.ip,
    },
  });
}
