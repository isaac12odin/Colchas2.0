import argon2 from "argon2";
import { z } from "zod";

/** Contrato único para contraseñas creadas por el usuario o el administrador. */
export const esquemaContrasenaSegura = z
  .string()
  .min(12, "Use al menos 12 caracteres.")
  .max(200);

export function crearHashContrasena(contrasena: string) {
  return argon2.hash(contrasena, {
    type: argon2.argon2id,
    memoryCost: 65_536,
    timeCost: 3,
  });
}
