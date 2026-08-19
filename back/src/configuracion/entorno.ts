import "dotenv/config";
import { z } from "zod";

const esquemaEntorno = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().min(1),
    FRONTEND_URL: z.string().url().default("http://localhost:3000"),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
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
