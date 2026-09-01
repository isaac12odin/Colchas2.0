import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { registro } from "../infraestructura/registro.js";

export class ErrorAplicacion extends Error {
  constructor(
    public readonly codigo: string,
    mensaje: string,
    public readonly estadoHttp = 400,
    public readonly detalles?: unknown,
  ) {
    super(mensaje);
  }
}

export function manejarNoEncontrado(req: Request, res: Response) {
  res.status(404).json({
    error: {
      codigo: "RUTA_NO_ENCONTRADA",
      mensaje: "La ruta solicitada no existe.",
    },
  });
}

export function manejarError(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (
    error &&
    typeof error === "object" &&
    "type" in error &&
    error.type === "entity.too.large"
  ) {
    res.status(413).json({
      error: {
        codigo: "CUERPO_DEMASIADO_GRANDE",
        mensaje: "El archivo o contenido enviado supera el límite permitido.",
      },
    });
    return;
  }

  if (error instanceof ErrorAplicacion) {
    res.status(error.estadoHttp).json({
      error: {
        codigo: error.codigo,
        mensaje: error.message,
        detalles: error.detalles,
      },
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(422).json({
      error: {
        codigo: "DATOS_INVALIDOS",
        mensaje: "Revise los datos enviados.",
        detalles: error.flatten(),
      },
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      res.status(409).json({
        error: {
          codigo: "REGISTRO_DUPLICADO",
          mensaje: "Ya existe un registro con esos datos.",
        },
      });
      return;
    }
    if (error.code === "P2025") {
      res.status(404).json({
        error: {
          codigo: "NO_ENCONTRADO",
          mensaje: "No se encontro el registro solicitado.",
        },
      });
      return;
    }
  }

  registro.error({ error, ruta: req.originalUrl }, "Error no controlado");
  res.status(500).json({
    error: {
      codigo: "ERROR_INTERNO",
      mensaje: "Ocurrio un error inesperado.",
    },
  });
}
