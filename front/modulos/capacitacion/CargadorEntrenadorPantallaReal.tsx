"use client";

import type { Rol } from "@/lib/tipos";

import { leccionesCapacitacion } from "./catalogo";
import { EntrenadorPantallaReal } from "./EntrenadorPantallaReal";
import { obtenerPracticaWebSegura } from "./indicePracticasWeb";

/**
 * Frontera pesada de capacitación. Sólo se descarga después de que el índice
 * mínimo validó el identificador, la ruta y el rol en el panel.
 */
export function CargadorEntrenadorPantallaReal({
  usuarioId,
  rol,
  leccionId,
  ruta,
  idioma,
}: {
  usuarioId: string;
  rol: Rol;
  leccionId: string;
  ruta: string;
  idioma: "es" | "en";
}) {
  const practica = obtenerPracticaWebSegura(leccionId, ruta, rol);
  if (!practica) return null;
  const leccion = leccionesCapacitacion.find(
    (candidata) =>
      candidata.id === practica.id && candidata.rutaReal === practica.rutaReal,
  );
  if (!leccion) return null;

  return (
    <EntrenadorPantallaReal
      usuarioId={usuarioId}
      leccion={leccion}
      idioma={idioma}
    />
  );
}
