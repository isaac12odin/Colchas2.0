import { leccionesDefinidas } from "./lecciones";
import type { LeccionCapacitacion } from "./tipos";

const guionesPorId = new Map(
  leccionesDefinidas.map((leccion) => [leccion.id, leccion.guion] as const),
);

/** Compatibilidad para el entrenador; los pasos viven junto a cada lección. */
export function pasosAtomicosDe(leccion: LeccionCapacitacion) {
  return guionesPorId.get(leccion.id) ?? [];
}

export function totalLeccionesWebConGuion() {
  return leccionesDefinidas.filter(
    (leccion) => leccion.plataforma === "WEB" && leccion.guion.length > 0,
  ).length;
}
