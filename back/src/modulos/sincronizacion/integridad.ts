import { createHmac, timingSafeEqual } from "node:crypto";
import type { OperacionSincronizada } from "@prisma/client";

import type { OperacionSincronizacion } from "./esquemas.js";

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

export function contenidoOperacion(operacion: OperacionSincronizacion) {
  return serializarCanonico({
    idOperacion: operacion.idOperacion,
    tipo: operacion.tipo,
    datos: operacion.datos,
    visitaOperacionId:
      "visitaOperacionId" in operacion
        ? operacion.visitaOperacionId
        : undefined,
  });
}

export function calcularHashOperacion(
  claveHex: string,
  usuarioId: string,
  operacion: OperacionSincronizacion,
) {
  const mensaje = [
    "NEXO_OFFLINE_V3",
    usuarioId,
    operacion.secuencia,
    operacion.hashAnterior,
    operacion.creadoEn.toISOString(),
    contenidoOperacion(operacion),
  ].join("|");
  return createHmac("sha512", Buffer.from(claveHex, "hex"))
    .update(mensaje)
    .digest("hex");
}

export function calcularHuellaLote(
  claveHex: string,
  operaciones: OperacionSincronizacion[],
) {
  return createHmac("sha512", Buffer.from(claveHex, "hex"))
    .update(operaciones.map((operacion) => operacion.hashIntegridad).join("|"))
    .digest("hex");
}

export function hashesIguales(a: string, b: string) {
  const izquierda = Buffer.from(a, "hex");
  const derecha = Buffer.from(b, "hex");
  return (
    izquierda.length === derecha.length && timingSafeEqual(izquierda, derecha)
  );
}

/** Impide reutilizar un id offline desde otro usuario, equipo o contenido. */
export function reciboCoincide(
  recibo: Pick<
    OperacionSincronizada,
    | "usuarioId"
    | "dispositivoId"
    | "hashContenido"
    | "secuencia"
    | "hashAnterior"
    | "creadaEnCliente"
  >,
  operacion: OperacionSincronizacion,
  usuarioId: string,
  dispositivoId: string,
) {
  return (
    recibo.usuarioId === usuarioId &&
    recibo.dispositivoId === dispositivoId &&
    recibo.secuencia === operacion.secuencia &&
    recibo.hashAnterior === operacion.hashAnterior &&
    recibo.creadaEnCliente.getTime() === operacion.creadoEn.getTime() &&
    hashesIguales(recibo.hashContenido, operacion.hashIntegridad)
  );
}
