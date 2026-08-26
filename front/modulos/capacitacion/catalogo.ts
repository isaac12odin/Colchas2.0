import type { Rol } from "@/lib/tipos";

import { leccionesDefinidas } from "./lecciones";
import type { LeccionCapacitacion } from "./tipos";

/** Fachada pública; cada capacitación se define en lecciones/<id>.ts. */
export const leccionesCapacitacion: readonly LeccionCapacitacion[] =
  leccionesDefinidas;

export const puntosPorLeccion = 100;

export function leccionesParaRol(rol: Rol) {
  return leccionesCapacitacion.filter((leccion) => leccion.roles.includes(rol));
}
