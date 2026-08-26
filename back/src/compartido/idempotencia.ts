import { createHash, createHmac } from "node:crypto";

import { entorno } from "../configuracion/entorno.js";

function normalizarCanonico(valor: unknown): unknown {
  if (valor instanceof Date) return valor.toISOString();
  if (Array.isArray(valor)) return valor.map(normalizarCanonico);
  if (valor && typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor as Record<string, unknown>)
        .filter(([, actual]) => actual !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([clave, actual]) => [clave, normalizarCanonico(actual)]),
    );
  }
  return valor;
}

/**
 * Huella estable de todo el comando. No se persiste el cuerpo ni PII en claro;
 * un mismo identificador sólo es idempotente si la petición es idéntica.
 */
export function huellaIdempotencia(valor: unknown) {
  const clave =
    entorno.SEARCH_HMAC_KEY ??
    createHash("sha256")
      .update(`nexo-idempotencia-desarrollo:${entorno.FIELD_ENCRYPTION_KEY}`)
      .digest("base64");
  return createHmac("sha256", Buffer.from(clave, "base64"))
    .update(JSON.stringify(normalizarCanonico(valor)))
    .digest("hex");
}
