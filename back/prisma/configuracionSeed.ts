import { z } from "zod";

const esquema = z.object({
  SEED_ADMIN_EMAIL: z
    .string({ required_error: "SEED_ADMIN_EMAIL es obligatorio." })
    .email()
    .transform((valor) => valor.toLowerCase()),
  SEED_ADMIN_PASSWORD: z
    .string({ required_error: "SEED_ADMIN_PASSWORD es obligatorio." })
    .min(12, "La contraseña inicial debe tener al menos 12 caracteres.")
    .max(200)
    .refine(
      (valor) =>
        !["systemof01", "password", "administrador", "changeme"].some((debil) =>
          valor.toLowerCase().includes(debil),
        ),
      "La contraseña inicial coincide con una credencial conocida o de ejemplo.",
    ),
});

/** El seed falla cerrado: nunca inventa credenciales ni usa valores de demo. */
export function leerConfiguracionSeed(
  variables: Record<string, string | undefined>,
) {
  const resultado = esquema.safeParse(variables);
  if (!resultado.success) {
    const detalle = resultado.error.issues
      .map((problema) => problema.message)
      .join(" ");
    throw new Error(
      `Configuración segura del administrador inválida. ${detalle}`,
    );
  }
  return {
    correo: resultado.data.SEED_ADMIN_EMAIL,
    contrasena: resultado.data.SEED_ADMIN_PASSWORD,
  };
}
