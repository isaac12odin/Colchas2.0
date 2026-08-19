import * as Crypto from "expo-crypto";

import {
  calcularHuellaLocal,
  type FilaOperacion,
  obtenerBaseLocal,
  obtenerClaveIntegridad,
  obtenerUsuarioLocal,
} from "../infraestructura/baseLocal";
import { contenidoOperacion } from "../seguridad/integridadOffline";
import { guardarProyeccionLocal, type ProyeccionLocal } from "./datosLocales";

export type TipoOperacion = "VISITA" | "ABONO" | "VENTA" | "ENTREGA";
export type EstadoOperacion =
  | "PENDIENTE"
  | "ENVIANDO"
  | "ERROR"
  | "SINCRONIZADA";

export interface OperacionLocal {
  id: string;
  tipo: TipoOperacion;
  datos: Record<string, unknown>;
  visitaOperacionId?: string;
}

export interface OperacionGuardada extends OperacionLocal {
  creadoEn: string;
  secuencia: number;
  hashIntegridad: string;
  hashAnterior: string;
  estado: EstadoOperacion;
  intentos: number;
  ultimoError: string | null;
}

async function insertarOperaciones(
  db: Awaited<ReturnType<typeof obtenerBaseLocal>>,
  operaciones: OperacionLocal[],
) {
  if (!operaciones.length) return;

  const secreto = await obtenerClaveIntegridad();
  const usuarioId = await obtenerUsuarioLocal();
  const ultima = await db.getFirstAsync<{
    secuencia: number;
    hash_integridad: string;
  }>(
    "SELECT secuencia, hash_integridad FROM operaciones ORDER BY secuencia DESC LIMIT 1",
  );
  let secuencia = ultima?.secuencia ?? 0;
  let hashAnterior = ultima?.hash_integridad || "GENESIS";

  for (const operacion of operaciones) {
    const existente = await db.getFirstAsync<{ id: string }>(
      "SELECT id FROM operaciones WHERE id = ?",
      operacion.id,
    );
    if (existente) continue;

    secuencia += 1;
    const creadoEn = new Date().toISOString();
    const datos = JSON.stringify(operacion);
    const hash = await calcularHuellaLocal(
      secreto,
      secuencia,
      hashAnterior,
      contenidoOperacion(operacion),
      creadoEn,
      usuarioId,
    );
    await db.runAsync(
      `INSERT INTO operaciones
       (id, tipo, datos, creado_en, secuencia, hash_anterior, hash_integridad, estado, intentos, usuario_id, actualizado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDIENTE', 0, ?, ?)`,
      operacion.id,
      operacion.tipo,
      datos,
      creadoEn,
      secuencia,
      hashAnterior,
      hash,
      usuarioId,
      creadoEn,
    );
    hashAnterior = hash;
  }
}

export async function encolarOperaciones(
  operaciones: OperacionLocal[],
  proyeccion?: ProyeccionLocal,
) {
  const db = await obtenerBaseLocal();
  const usuarioId = await obtenerUsuarioLocal();
  await db.withTransactionAsync(async () => {
    await insertarOperaciones(db, operaciones);
    if (proyeccion) await guardarProyeccionLocal(proyeccion, db, usuarioId);
  });
}

function presentarOperacion(fila: FilaOperacion): OperacionGuardada {
  const operacion = JSON.parse(fila.datos) as OperacionLocal;
  return {
    ...operacion,
    creadoEn: fila.creado_en,
    secuencia: fila.secuencia,
    hashIntegridad: fila.hash_integridad,
    hashAnterior: fila.hash_anterior,
    estado: fila.estado,
    intentos: fila.intentos,
    ultimoError: fila.ultimo_error,
  };
}

export async function leerOperaciones(): Promise<OperacionGuardada[]> {
  const db = await obtenerBaseLocal();
  const usuarioId = await obtenerUsuarioLocal();
  const filas = await db.getAllAsync<FilaOperacion>(
    "SELECT * FROM operaciones WHERE usuario_id = ? AND estado IN ('PENDIENTE', 'ERROR', 'ENVIANDO') ORDER BY secuencia ASC",
    usuarioId,
  );
  return filas.map(presentarOperacion);
}

export async function leerHistorialOperaciones(
  limite = 100,
): Promise<OperacionGuardada[]> {
  const db = await obtenerBaseLocal();
  const usuarioId = await obtenerUsuarioLocal();
  const filas = await db.getAllAsync<FilaOperacion>(
    "SELECT * FROM operaciones WHERE usuario_id = ? ORDER BY secuencia DESC LIMIT ?",
    usuarioId,
    limite,
  );
  return filas.map(presentarOperacion);
}

export async function verificarIntegridadOperaciones() {
  const db = await obtenerBaseLocal();
  const secreto = await obtenerClaveIntegridad();
  const filas = await db.getAllAsync<FilaOperacion>(
    "SELECT * FROM operaciones ORDER BY secuencia ASC",
  );
  let anterior = "GENESIS";
  let secuencia = 0;

  for (const fila of filas) {
    secuencia += 1;
    const esperado = await calcularHuellaLocal(
      secreto,
      fila.secuencia,
      fila.hash_anterior,
      contenidoOperacion(JSON.parse(fila.datos)),
      fila.creado_en,
      fila.usuario_id,
    );
    if (
      fila.secuencia !== secuencia ||
      fila.hash_anterior !== anterior ||
      fila.hash_integridad !== esperado
    ) {
      return {
        valida: false as const,
        operacionId: fila.id,
        secuencia: fila.secuencia,
      };
    }
    anterior = fila.hash_integridad;
  }
  return { valida: true as const, total: filas.length, huella: anterior };
}

export async function marcarEnviando(ids: string[]) {
  await actualizarOperaciones(ids, (db, id) =>
    db.runAsync(
      "UPDATE operaciones SET estado = 'ENVIANDO', actualizado_en = ? WHERE id = ?",
      new Date().toISOString(),
      id,
    ),
  );
}

export async function registrarResultados(
  resultados: Array<{ idOperacion: string; exito: boolean; error?: string }>,
) {
  const db = await obtenerBaseLocal();
  const usuarioId = await obtenerUsuarioLocal();
  await db.withTransactionAsync(async () => {
    for (const resultado of resultados) {
      await db.runAsync(
        "UPDATE operaciones SET estado = ?, intentos = intentos + 1, ultimo_error = ?, actualizado_en = ? WHERE id = ?",
        resultado.exito ? "SINCRONIZADA" : "ERROR",
        resultado.exito
          ? null
          : (resultado.error ?? "La operación fue rechazada por el servidor."),
        new Date().toISOString(),
        resultado.idOperacion,
      );
    }
    await db.runAsync(
      "INSERT OR REPLACE INTO metadatos (clave, valor) VALUES (?, ?)",
      `ultima_sincronizacion:${usuarioId}`,
      new Date().toISOString(),
    );
  });
}

export async function registrarFalloTransporte(ids: string[], mensaje: string) {
  await actualizarOperaciones(ids, (db, id) =>
    db.runAsync(
      "UPDATE operaciones SET estado = 'ERROR', intentos = intentos + 1, ultimo_error = ?, actualizado_en = ? WHERE id = ?",
      mensaje,
      new Date().toISOString(),
      id,
    ),
  );
}

async function actualizarOperaciones(
  ids: string[],
  actualizar: (
    db: Awaited<ReturnType<typeof obtenerBaseLocal>>,
    id: string,
  ) => Promise<unknown>,
) {
  const db = await obtenerBaseLocal();
  await db.withTransactionAsync(async () => {
    for (const id of ids) await actualizar(db, id);
  });
}

export async function obtenerEstadoCola() {
  const db = await obtenerBaseLocal();
  const usuarioId = await obtenerUsuarioLocal();
  const filas = await db.getAllAsync<{
    estado: EstadoOperacion;
    total: number;
  }>(
    "SELECT estado, COUNT(*) AS total FROM operaciones WHERE usuario_id = ? GROUP BY estado",
    usuarioId,
  );
  const estado = { pendientes: 0, errores: 0, sincronizadas: 0, enviando: 0 };
  for (const fila of filas) {
    if (fila.estado === "PENDIENTE") estado.pendientes = fila.total;
    if (fila.estado === "ERROR") estado.errores = fila.total;
    if (fila.estado === "SINCRONIZADA") estado.sincronizadas = fila.total;
    if (fila.estado === "ENVIANDO") estado.enviando = fila.total;
  }
  const ultima = await db.getFirstAsync<{ valor: string }>(
    "SELECT valor FROM metadatos WHERE clave = ?",
    `ultima_sincronizacion:${usuarioId}`,
  );
  return {
    ...estado,
    porEnviar: estado.pendientes + estado.errores + estado.enviando,
    ultimaSincronizacion: ultima?.valor ?? null,
  };
}

export async function contarOperaciones() {
  return (await obtenerEstadoCola()).porEnviar;
}

export async function obtenerDispositivoId() {
  const db = await obtenerBaseLocal();
  const actual = await db.getFirstAsync<{ valor: string }>(
    "SELECT valor FROM metadatos WHERE clave = ?",
    "dispositivo_id",
  );
  if (actual) return actual.valor;

  const id = `expo-${Crypto.randomUUID()}`;
  await db.runAsync(
    "INSERT INTO metadatos (clave, valor) VALUES (?, ?)",
    "dispositivo_id",
    id,
  );
  return id;
}
