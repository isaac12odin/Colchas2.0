import "dotenv/config";
import { z } from "zod";

const esquemaEntorno = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().min(1),
    IMAGE_STORAGE_DIR: z.string().trim().min(1).optional(),
    FRONTEND_URL: z.string().url().default("http://localhost:3000"),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    SEARCH_HMAC_KEY: z
      .string()
      .optional()
      .refine((valor) => {
        if (!valor) return true;
        try {
          return Buffer.from(valor, "base64").length === 32;
        } catch {
          return false;
        }
      }, "SEARCH_HMAC_KEY debe contener exactamente 32 bytes en base64"),
    FIELD_ENCRYPTION_KEY: z.string().refine((valor) => {
      try {
        return Buffer.from(valor, "base64").length === 32;
      } catch {
        return false;
      }
    }, "FIELD_ENCRYPTION_KEY debe contener exactamente 32 bytes en base64"),
  })
  .superRefine((valor, contexto) => {
    if (
      valor.NODE_ENV === "production" &&
      !valor.FRONTEND_URL.startsWith("https://")
    ) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["FRONTEND_URL"],
        message: "En produccion FRONTEND_URL debe usar HTTPS.",
      });
    }
    if (valor.NODE_ENV === "production" && !valor.SEARCH_HMAC_KEY) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SEARCH_HMAC_KEY"],
        message:
          "En producción se requiere una clave HMAC de búsqueda dedicada.",
      });
    }
  });

const resultado = esquemaEntorno.safeParse(process.env);

if (!resultado.success) {
  console.error(
    "Configuracion de entorno invalida:",
    resultado.error.flatten().fieldErrors,
  );
  throw new Error("No se pudo iniciar por variables de entorno invalidas.");
}

export const entorno = resultado.data;
