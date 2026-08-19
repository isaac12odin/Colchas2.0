import type { NextFunction, Request, Response } from "express";
import type { RolUsuario } from "@prisma/client";
import { ErrorAplicacion } from "../compartido/errores.js";
import { validarTokenAcceso } from "./tokens.js";
import { rolTienePermiso, type Permiso } from "./permisos.js";

export function autenticar(req: Request, _res: Response, next: NextFunction) {
  const encabezado = req.headers.authorization;
  const token = encabezado?.startsWith("Bearer ")
    ? encabezado.slice(7)
    : req.cookies?.access_token;
  if (!token)
    throw new ErrorAplicacion("NO_AUTENTICADO", "Debe iniciar sesion.", 401);

  let identidad;
  try {
    identidad = validarTokenAcceso(token);
  } catch {
    throw new ErrorAplicacion(
      "SESION_EXPIRADA",
      "La sesion expiro o no es valida.",
      401,
    );
  }
  const rutaPermitida =
    req.originalUrl.includes("/auth/sesion") ||
    req.originalUrl.includes("/auth/cambiar-contrasena");
  if (identidad.debeCambiarContrasena && !rutaPermitida) {
    throw new ErrorAplicacion(
      "CAMBIO_CONTRASENA_REQUERIDO",
      "Debe cambiar la contrasena temporal antes de operar.",
      428,
    );
  }
  req.usuario = {
    id: identidad.sub,
    correo: identidad.correo,
    rol: identidad.rol,
  };
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
