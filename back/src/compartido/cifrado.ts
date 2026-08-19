import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { entorno } from "../configuracion/entorno.js";

const algoritmo = "aes-256-gcm";
const clave = Buffer.from(entorno.FIELD_ENCRYPTION_KEY, "base64");

/** Cifra datos personales en reposo. El canal de transporte debe usar TLS 1.2+ en produccion. */
export function cifrarCampo(valor: string): string {
  const iv = randomBytes(12);
  const cifrador = createCipheriv(algoritmo, clave, iv);
  const cifrado = Buffer.concat([
    cifrador.update(valor, "utf8"),
    cifrador.final(),
  ]);
  const etiqueta = cifrador.getAuthTag();
  return [
    "v1",
    iv.toString("base64url"),
    etiqueta.toString("base64url"),
    cifrado.toString("base64url"),
  ].join(".");
}

export function descifrarCampo(valor: string): string {
  const [version, iv, etiqueta, cifrado] = valor.split(".");
  if (version !== "v1" || !iv || !etiqueta || !cifrado)
    throw new Error("Formato de campo cifrado invalido.");
  const descifrador = createDecipheriv(
    algoritmo,
    clave,
    Buffer.from(iv, "base64url"),
  );
  descifrador.setAuthTag(Buffer.from(etiqueta, "base64url"));
  return Buffer.concat([
    descifrador.update(Buffer.from(cifrado, "base64url")),
    descifrador.final(),
  ]).toString("utf8");
}

export function hashBusqueda(valor: string): string {
  return createHash("sha256").update(valor.trim().toLowerCase()).digest("hex");
}

export function normalizarTelefono(valor: string): string {
  return valor.replace(/\D/g, "");
}
