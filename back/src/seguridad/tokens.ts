import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import type { RolUsuario } from "@prisma/client";
import { entorno } from "../configuracion/entorno.js";

export interface IdentidadToken {
  sub: string;
  correo: string;
  rol: RolUsuario;
  debeCambiarContrasena: boolean;
}

export function crearTokenAcceso(identidad: IdentidadToken): string {
  return jwt.sign(identidad, entorno.JWT_ACCESS_SECRET, {
    expiresIn: "15m",
    issuer: "nexo-api",
    audience: "nexo-apps",
  });
}

export function validarTokenAcceso(token: string): IdentidadToken {
  return jwt.verify(token, entorno.JWT_ACCESS_SECRET, {
    issuer: "nexo-api",
    audience: "nexo-apps",
  }) as IdentidadToken;
}

export function crearTokenRefresco(identidad: IdentidadToken): string {
  return jwt.sign(
    { ...identidad, nonce: randomBytes(16).toString("hex") },
    entorno.JWT_REFRESH_SECRET,
    {
      expiresIn: "30d",
      issuer: "nexo-api",
      audience: "nexo-apps",
    },
  );
}

export function validarTokenRefresco(token: string): IdentidadToken {
  return jwt.verify(token, entorno.JWT_REFRESH_SECRET, {
    issuer: "nexo-api",
    audience: "nexo-apps",
  }) as IdentidadToken;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function crearTokenCsrf(): string {
  return randomBytes(24).toString("base64url");
}
