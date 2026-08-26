export function puntosCapacitacionMovil(completadas: readonly string[]) {
  return new Set(completadas).size * 100;
}

export function nivelCapacitacionMovil(completadas: readonly string[]) {
  return Math.floor(puntosCapacitacionMovil(completadas) / 500) + 1;
}
