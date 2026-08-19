import type { Jornada } from "../tipos";
import {
  obtenerBaseLocal,
  obtenerUsuarioLocal,
} from "../infraestructura/baseLocal";

export async function guardarJornada(
  rutaId: string,
  fecha: string,
  jornada: Jornada,
) {
  const db = await obtenerBaseLocal();
  const usuarioId = await obtenerUsuarioLocal();
  await db.runAsync(
    "INSERT OR REPLACE INTO jornadas (clave, datos, actualizado_en) VALUES (?, ?, ?)",
    `${usuarioId}:${rutaId}:${fecha}`,
    JSON.stringify(jornada),
    new Date().toISOString(),
  );
}

export async function leerJornada(
  rutaId: string,
  fecha: string,
): Promise<Jornada | null> {
  const db = await obtenerBaseLocal();
  const usuarioId = await obtenerUsuarioLocal();
  const fila = await db.getFirstAsync<{
    datos: string;
    actualizado_en: string;
  }>(
    "SELECT datos, actualizado_en FROM jornadas WHERE clave = ?",
    `${usuarioId}:${rutaId}:${fecha}`,
  );
  return fila
    ? { ...JSON.parse(fila.datos), guardadaEn: fila.actualizado_en }
    : null;
}

export async function guardarCache<T>(clave: string, datos: T) {
  const db = await obtenerBaseLocal();
  const usuarioId = await obtenerUsuarioLocal();
  await db.runAsync(
    "INSERT OR REPLACE INTO cache (clave, datos, actualizado_en) VALUES (?, ?, ?)",
    `${usuarioId}:${clave}`,
    JSON.stringify(datos),
    new Date().toISOString(),
  );
}

export async function leerCache<T>(clave: string): Promise<T | null> {
  const db = await obtenerBaseLocal();
  const usuarioId = await obtenerUsuarioLocal();
  const fila = await db.getFirstAsync<{ datos: string }>(
    "SELECT datos FROM cache WHERE clave = ?",
    `${usuarioId}:${clave}`,
  );
  return fila ? JSON.parse(fila.datos) : null;
}

export async function guardarProyeccionLocal(
  proyeccion: ProyeccionLocal,
  db: Awaited<ReturnType<typeof obtenerBaseLocal>>,
  usuarioId: string,
) {
  if (proyeccion.jornada) {
    await db.runAsync(
      "INSERT OR REPLACE INTO jornadas (clave, datos, actualizado_en) VALUES (?, ?, ?)",
      `${usuarioId}:${proyeccion.jornada.rutaId}:${proyeccion.jornada.fecha}`,
      JSON.stringify(proyeccion.jornada.datos),
      new Date().toISOString(),
    );
  }
  for (const cache of proyeccion.caches ?? []) {
    await db.runAsync(
      "INSERT OR REPLACE INTO cache (clave, datos, actualizado_en) VALUES (?, ?, ?)",
      `${usuarioId}:${cache.clave}`,
      JSON.stringify(cache.datos),
      new Date().toISOString(),
    );
  }
}

export interface ProyeccionLocal {
  jornada?: { rutaId: string; fecha: string; datos: Jornada };
  caches?: Array<{ clave: string; datos: unknown }>;
}
