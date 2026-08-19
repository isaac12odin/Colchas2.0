import * as Crypto from "expo-crypto";
import * as SQLite from "expo-sqlite";
import * as SecureStore from "expo-secure-store";
import {
  contenidoOperacion,
  hmacSha512,
  mensajeOperacion,
} from "../seguridad/integridadOffline";

import type {
  EstadoOperacion,
  TipoOperacion,
} from "../repositorios/operacionesLocal";

let basePromesa: Promise<SQLite.SQLiteDatabase> | null = null;
const NOMBRE_BASE = "nexo-offline.db";

function exigirEntornoE2eNativo() {
  if (process.env.EXPO_PUBLIC_E2E_SQLCIPHER !== "SI")
    throw new Error(
      "La operación destructiva de diagnóstico sólo está disponible en la compilación E2E nativa.",
    );
}

export interface FilaOperacion {
  id: string;
  tipo: TipoOperacion;
  datos: string;
  creado_en: string;
  secuencia: number;
  hash_anterior: string;
  hash_integridad: string;
  estado: EstadoOperacion;
  intentos: number;
  ultimo_error: string | null;
  usuario_id: string;
}

export async function obtenerClaveLocal() {
  const guardada = await SecureStore.getItemAsync("clave_base_local");
  if (guardada) return guardada;

  const bytes = await Crypto.getRandomBytesAsync(32);
  const clave = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  await SecureStore.setItemAsync("clave_base_local", clave, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return clave;
}

export async function obtenerClaveIntegridad() {
  const guardada = await SecureStore.getItemAsync("clave_integridad_offline");
  if (guardada) return guardada;
  const bytes = await Crypto.getRandomBytesAsync(32);
  const clave = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  await SecureStore.setItemAsync("clave_integridad_offline", clave, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return clave;
}

export async function obtenerUsuarioLocal() {
  return (await SecureStore.getItemAsync("usuario_id_local")) ?? "SIN_USUARIO";
}

export async function calcularHuellaLocal(
  secreto: string,
  secuencia: number,
  hashAnterior: string,
  datos: string,
  creadoEn: string,
  usuarioId: string,
) {
  return hmacSha512(
    secreto,
    mensajeOperacion(
      usuarioId,
      secuencia,
      hashAnterior,
      creadoEn,
      datos,
    ),
  );
}

async function asegurarColumnas(
  db: SQLite.SQLiteDatabase,
  secreto: string,
  usuarioId: string,
) {
  const columnas = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(operaciones)",
  );
  const presentes = new Set(columnas.map((columna) => columna.name));
  const faltantes: Array<[string, string]> = [
    ["secuencia", "INTEGER NOT NULL DEFAULT 0"],
    ["hash_anterior", "TEXT NOT NULL DEFAULT 'GENESIS'"],
    ["hash_integridad", "TEXT NOT NULL DEFAULT ''"],
    ["estado", "TEXT NOT NULL DEFAULT 'PENDIENTE'"],
    ["intentos", "INTEGER NOT NULL DEFAULT 0"],
    ["ultimo_error", "TEXT"],
    ["actualizado_en", "TEXT NOT NULL DEFAULT ''"],
    ["usuario_id", "TEXT NOT NULL DEFAULT ''"],
  ];

  for (const [nombre, definicion] of faltantes) {
    if (!presentes.has(nombre)) {
      await db.execAsync(
        `ALTER TABLE operaciones ADD COLUMN ${nombre} ${definicion}`,
      );
    }
  }

  const antiguas = await db.getAllAsync<{ id: string }>(
    "SELECT id FROM operaciones WHERE secuencia = 0 ORDER BY creado_en, id",
  );
  let ultima =
    (
      await db.getFirstAsync<{ valor: number }>(
        "SELECT COALESCE(MAX(secuencia), 0) AS valor FROM operaciones",
      )
    )?.valor ?? 0;

  for (const operacion of antiguas) {
    ultima += 1;
    await db.runAsync(
      "UPDATE operaciones SET secuencia = ?, estado = ? WHERE id = ?",
      ultima,
      "PENDIENTE",
      operacion.id,
    );
  }
  await db.runAsync(
    "UPDATE operaciones SET usuario_id = ? WHERE usuario_id = ''",
    usuarioId,
  );
  await completarHuellasFaltantes(db, secreto);
}

async function completarHuellasFaltantes(
  db: SQLite.SQLiteDatabase,
  secreto: string,
) {
  const filas = await db.getAllAsync<FilaOperacion>(
    "SELECT * FROM operaciones ORDER BY secuencia ASC",
  );
  const version = await db.getFirstAsync<{ valor: string }>(
    "SELECT valor FROM metadatos WHERE clave = ?",
    "version_huella",
  );
  if (version?.valor === "3" && filas.every((fila) => fila.hash_integridad)) {
    return;
  }

  let hashAnterior = "GENESIS";
  for (const fila of filas) {
    const operacion = JSON.parse(fila.datos);
    const hash = await calcularHuellaLocal(
      secreto,
      fila.secuencia,
      hashAnterior,
      contenidoOperacion(operacion),
      fila.creado_en,
      fila.usuario_id,
    );
    await db.runAsync(
      "UPDATE operaciones SET hash_anterior = ?, hash_integridad = ?, actualizado_en = ? WHERE id = ?",
      hashAnterior,
      hash,
      fila.creado_en,
      fila.id,
    );
    hashAnterior = hash;
  }
  await db.runAsync(
    "INSERT OR REPLACE INTO metadatos (clave, valor) VALUES (?, ?)",
    "version_huella",
    "3",
  );
}

export async function obtenerBaseLocal() {
  if (!basePromesa) {
    basePromesa = SQLite.openDatabaseAsync(NOMBRE_BASE).then(async (db) => {
      const clave = await obtenerClaveLocal();
      const claveIntegridad = await obtenerClaveIntegridad();
      const usuarioId = await obtenerUsuarioLocal();

      // SQLCipher cifra páginas, índices y journal; la clave sólo vive en SecureStore.
      await db.execAsync(
        `PRAGMA key = '${clave.replaceAll("'", "''")}'; PRAGMA cipher_memory_security = ON; PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA foreign_keys = ON;`,
      );
      await db.execAsync(`
          CREATE TABLE IF NOT EXISTS jornadas (clave TEXT PRIMARY KEY NOT NULL, datos TEXT NOT NULL, actualizado_en TEXT NOT NULL);
          CREATE TABLE IF NOT EXISTS cache (clave TEXT PRIMARY KEY NOT NULL, datos TEXT NOT NULL, actualizado_en TEXT NOT NULL);
          CREATE TABLE IF NOT EXISTS operaciones (
            id TEXT PRIMARY KEY NOT NULL,
            tipo TEXT NOT NULL,
            datos TEXT NOT NULL,
            creado_en TEXT NOT NULL,
            secuencia INTEGER NOT NULL UNIQUE,
            hash_anterior TEXT NOT NULL,
            hash_integridad TEXT NOT NULL,
            estado TEXT NOT NULL DEFAULT 'PENDIENTE',
            intentos INTEGER NOT NULL DEFAULT 0,
            ultimo_error TEXT,
            usuario_id TEXT NOT NULL,
            actualizado_en TEXT NOT NULL
          );
          CREATE INDEX IF NOT EXISTS operaciones_estado_secuencia ON operaciones (estado, secuencia);
          CREATE TABLE IF NOT EXISTS metadatos (clave TEXT PRIMARY KEY NOT NULL, valor TEXT NOT NULL);
        `);
      await asegurarColumnas(db, claveIntegridad, usuarioId);
      return db;
    });
  }
  return basePromesa;
}

/**
 * Diagnóstico ejecutado por la prueba nativa: no se limita a comprobar tablas,
 * también exige que el motor exponga SQLCipher y valide todas sus páginas.
 */
export async function diagnosticarProteccionBaseLocal() {
  const db = await obtenerBaseLocal();
  const version = await db.getFirstAsync<{ cipher_version: string }>(
    "PRAGMA cipher_version",
  );
  const integridad = await db.getFirstAsync<{ integrity_check: string }>(
    "PRAGMA integrity_check",
  );
  const erroresCifrado = await db.getAllAsync<Record<string, string>>(
    "PRAGMA cipher_integrity_check",
  );
  return {
    sqlCipherActivo: Boolean(version?.cipher_version),
    versionSqlCipher: version?.cipher_version ?? null,
    integridadSqlite: integridad?.integrity_check === "ok",
    integridadCifrado: erroresCifrado.length === 0,
  };
}

export async function cerrarBaseLocalParaPruebas() {
  exigirEntornoE2eNativo();
  const actual = basePromesa;
  basePromesa = null;
  if (actual) await (await actual).closeAsync();
}

/** Borra únicamente la base del bundle E2E, nunca datos de la app productiva. */
export async function reiniciarBaseLocalParaPruebas() {
  exigirEntornoE2eNativo();
  await cerrarBaseLocalParaPruebas();
  await SQLite.deleteDatabaseAsync(NOMBRE_BASE).catch(() => undefined);
  await SecureStore.deleteItemAsync("clave_base_local");
  await SecureStore.deleteItemAsync("clave_integridad_offline");
}

/**
 * Abre el archivo existente con otra clave. Una base realmente cifrada debe
 * rechazar la lectura antes de volver a abrirse con la clave de SecureStore.
 */
export async function comprobarRechazoClaveIncorrectaParaPruebas() {
  exigirEntornoE2eNativo();
  await cerrarBaseLocalParaPruebas();
  const dbIncorrecta = await SQLite.openDatabaseAsync(NOMBRE_BASE);
  let rechazada = false;
  try {
    await dbIncorrecta.execAsync(
      "PRAGMA key = 'clave-e2e-deliberadamente-incorrecta';",
    );
    await dbIncorrecta.getFirstAsync(
      "SELECT COUNT(*) AS total FROM sqlite_master",
    );
  } catch {
    rechazada = true;
  } finally {
    await dbIncorrecta.closeAsync();
  }
  await obtenerBaseLocal();
  return rechazada;
}
