import * as Crypto from "expo-crypto";

function normalizar(valor: unknown): unknown {
  if (valor instanceof Date) return valor.toISOString();
  if (Array.isArray(valor)) return valor.map(normalizar);
  if (valor && typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor as Record<string, unknown>)
        .filter(([, actual]) => actual !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([clave, actual]) => [clave, normalizar(actual)]),
    );
  }
  return valor;
}

export function serializarCanonico(valor: unknown) {
  return JSON.stringify(normalizar(valor));
}

function bytesHex(valor: string) {
  if (!/^[a-f0-9]+$/i.test(valor) || valor.length % 2)
    throw new Error("Clave de integridad inválida.");
  return Uint8Array.from(
    valor.match(/.{2}/g)!.map((par) => Number.parseInt(par, 16)),
  );
}

function concatenar(...partes: Uint8Array[]) {
  const salida = new Uint8Array(
    partes.reduce((total, parte) => total + parte.length, 0),
  );
  let posicion = 0;
  for (const parte of partes) {
    salida.set(parte, posicion);
    posicion += parte.length;
  }
  return salida;
}

function aHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

/** HMAC-SHA-512 implementado sobre el digest nativo de Expo. */
export async function hmacSha512(claveHex: string, mensaje: string) {
  const bloque = 128;
  let clave = bytesHex(claveHex);
  if (clave.length > bloque)
    clave = new Uint8Array(
      await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA512, clave),
    );
  const preparada = new Uint8Array(bloque);
  preparada.set(clave);
  const interior = preparada.map((byte) => byte ^ 0x36);
  const exterior = preparada.map((byte) => byte ^ 0x5c);
  const contenido = new TextEncoder().encode(mensaje);
  const hashInterior = new Uint8Array(
    await Crypto.digest(
      Crypto.CryptoDigestAlgorithm.SHA512,
      concatenar(interior, contenido),
    ),
  );
  return aHex(
    await Crypto.digest(
      Crypto.CryptoDigestAlgorithm.SHA512,
      concatenar(exterior, hashInterior),
    ),
  );
}

export function contenidoOperacion(operacion: {
  id: string;
  tipo: string;
  datos: Record<string, unknown>;
  visitaOperacionId?: string;
}) {
  return serializarCanonico({
    idOperacion: operacion.id,
    tipo: operacion.tipo,
    datos: operacion.datos,
    visitaOperacionId: operacion.visitaOperacionId,
  });
}

export function mensajeOperacion(
  usuarioId: string,
  secuencia: number,
  hashAnterior: string,
  creadoEn: string,
  contenido: string,
) {
  return `NEXO_OFFLINE_V3|${usuarioId}|${secuencia}|${hashAnterior}|${creadoEn}|${contenido}`;
}
