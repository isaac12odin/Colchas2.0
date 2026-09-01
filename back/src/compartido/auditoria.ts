import type { Request } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../infraestructura/prisma.js";

const CLAVE_SECRETA =
  /(contrasena|contraseña|password|secreto|token|cookie|authorization|hashcontrasena|base64|cifrad[oa]|search_hmac|field_encryption)/i;
const CLAVE_DIRECCION = /direccion/i;
const CLAVE_TELEFONO = /^telefono$/i;
const CLAVE_CORREO = /^(correo|email)$/i;
const MAXIMA_PROFUNDIDAD = 8;
const MAXIMOS_ELEMENTOS = 200;

function nombreConstructor(valor: object) {
  try {
    const nombre = valor.constructor?.name;
    return typeof nombre === "string" && nombre ? nombre : "Objeto";
  } catch {
    return "Objeto";
  }
}

function textoBinario(bytes: number) {
  return `[BINARIO OMITIDO: ${bytes} bytes]`;
}

function esObjetoPlano(valor: object) {
  const prototipo = Object.getPrototypeOf(valor);
  return prototipo === Object.prototype || prototipo === null;
}

function sanearValor(
  valor: unknown,
  profundidad: number,
  trayectoria: WeakSet<object>,
): unknown {
  if (valor === null || valor === undefined) return valor;
  if (profundidad > MAXIMA_PROFUNDIDAD) return "[PROFUNDIDAD OMITIDA]";
  if (typeof valor === "string")
    return valor.length > 1_000
      ? `[CONTENIDO OMITIDO: ${valor.length} caracteres]`
      : valor;
  if (typeof valor === "boolean") return valor;
  if (typeof valor === "number")
    return Number.isFinite(valor) ? valor : `[NÚMERO NO FINITO: ${valor}]`;
  if (typeof valor === "bigint") return valor.toString();
  if (typeof valor === "symbol") return "[SÍMBOLO OMITIDO]";
  if (typeof valor === "function") return "[FUNCIÓN OMITIDA]";

  if (Prisma.Decimal.isDecimal(valor)) return valor.toString();
  if (valor instanceof Date)
    return Number.isNaN(valor.getTime())
      ? "[FECHA INVÁLIDA]"
      : valor.toISOString();
  if (Buffer.isBuffer(valor)) return textoBinario(valor.byteLength);
  if (valor instanceof ArrayBuffer) return textoBinario(valor.byteLength);
  if (ArrayBuffer.isView(valor)) return textoBinario(valor.byteLength);
  if (valor instanceof URL) return valor.toString();

  if (trayectoria.has(valor)) return "[REFERENCIA CIRCULAR]";
  trayectoria.add(valor);
  try {
    if (Array.isArray(valor))
      return valor
        .slice(0, MAXIMOS_ELEMENTOS)
        .map(
          (elemento) =>
            sanearValor(elemento, profundidad + 1, trayectoria) ?? null,
        );

    if (valor instanceof Map) {
      const entradas: Array<[string, unknown]> = [];
      let indice = 0;
      for (const [clave, dato] of valor) {
        if (indice >= MAXIMOS_ELEMENTOS) break;
        const nombre =
          typeof clave === "string" || typeof clave === "number"
            ? String(clave)
            : `entrada_${indice + 1}`;
        if (CLAVE_SECRETA.test(nombre)) {
          entradas.push([nombre, "[PROTEGIDO]"]);
          indice += 1;
          continue;
        }
        entradas.push([
          nombre,
          sanearValor(dato, profundidad + 1, trayectoria),
        ]);
        indice += 1;
      }
      return Object.fromEntries(entradas);
    }
    if (valor instanceof Set)
      return [...valor]
        .slice(0, MAXIMOS_ELEMENTOS)
        .map(
          (elemento) =>
            sanearValor(elemento, profundidad + 1, trayectoria) ?? null,
        );

    if (valor instanceof Error) {
      const error: Record<string, unknown> = {
        nombre: valor.name,
        mensaje: valor.message,
      };
      const codigo = (valor as Error & { code?: unknown }).code;
      if (codigo !== undefined)
        error.codigo = sanearValor(codigo, profundidad + 1, trayectoria);
      return error;
    }

    if (!esObjetoPlano(valor)) {
      const serializable = (valor as { toJSON?: unknown }).toJSON;
      if (typeof serializable === "function") {
        try {
          const convertido = serializable.call(valor);
          if (convertido !== valor)
            return sanearValor(convertido, profundidad + 1, trayectoria);
        } catch {
          // Se conservan debajo los campos enumerables sin confiar en código ajeno.
        }
      }
    }

    const resultado: Record<string, unknown> = {};
    if (!esObjetoPlano(valor)) resultado.$tipo = nombreConstructor(valor);
    const claves = Object.keys(valor).slice(0, MAXIMOS_ELEMENTOS);
    for (const clave of claves) {
      if (CLAVE_SECRETA.test(clave)) {
        resultado[clave] = "[PROTEGIDO]";
        continue;
      }
      if (CLAVE_DIRECCION.test(clave)) {
        resultado[clave] = "[DATO PERSONAL]";
        continue;
      }
      if (CLAVE_CORREO.test(clave)) {
        resultado[clave] = "[DATO PERSONAL]";
        continue;
      }
      let dato: unknown;
      try {
        dato = (valor as Record<string, unknown>)[clave];
      } catch {
        resultado[clave] = "[VALOR INACCESIBLE]";
        continue;
      }
      if (CLAVE_TELEFONO.test(clave) && typeof dato === "string") {
        resultado[clave] = `***${dato.replace(/\D/g, "").slice(-4)}`;
        continue;
      }
      const saneado = sanearValor(dato, profundidad + 1, trayectoria);
      if (saneado !== undefined) resultado[clave] = saneado;
    }
    if (Object.keys(valor).length > MAXIMOS_ELEMENTOS)
      resultado.$camposOmitidos = Object.keys(valor).length - MAXIMOS_ELEMENTOS;
    return resultado;
  } finally {
    trayectoria.delete(valor);
  }
}

/**
 * La bitácora explica qué cambió sin convertirse en una segunda base de
 * secretos. También se aplica al consultar registros históricos anteriores.
 */
export function sanearDatosAuditoria(valor: unknown, profundidad = 0): unknown {
  try {
    return sanearValor(valor, profundidad, new WeakSet<object>());
  } catch {
    return "[VALOR NO SERIALIZABLE]";
  }
}

export async function auditar(
  req: Request,
  accion: string,
  entidad: string,
  entidadId?: string,
  datosAntes?: unknown,
  datosDespues?: unknown,
) {
  await prisma.auditoria.create({
    data: {
      usuarioId: req.usuario?.id,
      accion,
      entidad,
      entidadId,
      datosAntes: sanearDatosAuditoria(datosAntes) as never,
      datosDespues: sanearDatosAuditoria(datosDespues) as never,
      ip: req.ip,
    },
  });
}
