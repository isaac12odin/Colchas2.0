import type { NextFunction, Request, Response } from "express";
import type { RolUsuario } from "@prisma/client";
import { ErrorAplicacion } from "../compartido/errores.js";
import { validarTokenAcceso } from "./tokens.js";
import { rolTienePermiso, type Permiso } from "./permisos.js";
import { prisma } from "../infraestructura/prisma.js";

function permiteCambioContrasenaObligatorio(req: Request) {
  const ruta = req.originalUrl.split("?", 1)[0];
  return (
    (req.method === "GET" && ruta === "/api/v1/auth/sesion") ||
    (req.method === "POST" && ruta === "/api/v1/auth/cambiar-contrasena")
  );
}

export async function autenticar(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const encabezado = req.headers.authorization;
  const token = encabezado?.startsWith("Bearer ")
    ? encabezado.slice(7)
    : req.cookies?.access_token;
  if (!token)
    throw new ErrorAplicacion("NO_AUTENTICADO", "Debe iniciar sesion.", 401);

  let identidad: ReturnType<typeof validarTokenAcceso>;
  try {
    identidad = validarTokenAcceso(token);
  } catch {
    throw new ErrorAplicacion(
      "SESION_EXPIRADA",
      "La sesion expiro o no es valida.",
      401,
    );
  }
  const usuarioActual = await prisma.usuario.findUnique({
    where: { id: identidad.sub },
    select: {
      id: true,
      correo: true,
      rol: true,
      activo: true,
      debeCambiarContrasena: true,
      tokenVersion: true,
    },
  });
  if (
    !usuarioActual?.activo ||
    identidad.tokenVersion !== usuarioActual.tokenVersion ||
    identidad.rol !== usuarioActual.rol
  )
    throw new ErrorAplicacion(
      "SESION_REVOCADA",
      "La sesión fue revocada por un cambio de seguridad. Inicie sesión nuevamente.",
      401,
    );
  req.usuario = {
    id: usuarioActual.id,
    correo: usuarioActual.correo,
    rol: usuarioActual.rol,
  };
  if (
    usuarioActual.debeCambiarContrasena &&
    !permiteCambioContrasenaObligatorio(req)
  ) {
    throw new ErrorAplicacion(
      "CAMBIO_CONTRASENA_REQUERIDO",
      "Debe reemplazar la contraseña temporal antes de continuar.",
      428,
    );
  }
  next();
}

export function permitir(...roles: RolUsuario[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      throw new ErrorAplicacion(
        "SIN_PERMISO",
        "Su rol no permite realizar esta accion.",
        403,
      );
    }
    next();
  };
}

export function permitirPermiso(permiso: Permiso) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.usuario || !rolTienePermiso(req.usuario.rol, permiso)) {
      throw new ErrorAplicacion(
        "SIN_PERMISO",
        "Su rol no permite realizar esta accion.",
        403,
      );
    }
    next();
  };
}

export function protegerCsrf(req: Request, _res: Response, next: NextFunction) {
  if (
    ["GET", "HEAD", "OPTIONS"].includes(req.method) ||
    req.headers.authorization
  )
    return next();
  if (req.path.endsWith("/auth/iniciar-sesion")) return next();
  // En móvil el refresh token viaja explícitamente en el cuerpo y actúa como
  // credencial bearer; no existe una cookie reutilizable por un ataque CSRF.
  // Las sesiones web siguen obligadas a presentar cookie y encabezado iguales.
  const autenticacionMovil =
    (req.path.endsWith("/auth/renovar") ||
      req.path.endsWith("/auth/cerrar-sesion")) &&
    typeof req.body?.refreshToken === "string";
  if (autenticacionMovil) return next();

  const cookie = req.cookies?.csrf_token;
  const encabezado = req.headers["x-csrf-token"];
  if (!cookie || typeof encabezado !== "string" || cookie !== encabezado) {
    throw new ErrorAplicacion(
      "CSRF_INVALIDO",
      "La solicitud no pudo validarse. Actualice la pagina.",
      403,
    );
  }
  next();
}
