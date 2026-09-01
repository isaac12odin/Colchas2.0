export interface DistribucionCapacitacionMovil {
  compacta: boolean;
  tablet: boolean;
  margenHorizontal: number;
  anchoMaximo: number;
  columnasResumen: 1 | 2 | 3;
  altoMinimoControl: number;
}

/**
 * Decisiones de presentación independientes de React Native.
 * Mantenerlas puras permite comprobar teléfonos pequeños y tablets sin montar UI.
 */
export function distribucionCapacitacionMovil(
  anchoDisponible: number,
): DistribucionCapacitacionMovil {
  const ancho = Number.isFinite(anchoDisponible)
    ? Math.max(240, anchoDisponible)
    : 360;
  const compacta = ancho < 360;
  const tablet = ancho >= 600;

  return {
    compacta,
    tablet,
    margenHorizontal: compacta ? 10 : tablet ? 24 : 16,
    anchoMaximo: tablet ? 760 : ancho,
    columnasResumen: tablet ? 3 : compacta ? 1 : 2,
    // 48 dp es el mínimo táctil; dejamos margen para texto grande.
    altoMinimoControl: compacta ? 50 : 52,
  };
}

export function porcentajeEtapaCapacitacion(
  completadas: readonly string[],
  lecciones: readonly string[],
) {
  if (lecciones.length === 0) return 0;
  const unicas = new Set(completadas);
  const resueltas = lecciones.filter((id) => unicas.has(id)).length;
  return Math.round((resueltas / lecciones.length) * 100);
}

export function siguienteLeccionPendiente(
  completadas: readonly string[],
  leccionesOrdenadas: readonly string[],
) {
  const unicas = new Set(completadas);
  return leccionesOrdenadas.find((id) => !unicas.has(id)) ?? null;
}
