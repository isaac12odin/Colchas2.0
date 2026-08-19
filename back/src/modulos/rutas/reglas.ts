export function combinarClientesRuta(
  clientesDeLocalidades: string[],
  clientesElegidos: string[],
) {
  return [...new Set([...clientesDeLocalidades, ...clientesElegidos])];
}

export function esVisitaFueraDeRuta(asignacion?: { activo: boolean } | null) {
  return !asignacion?.activo;
}
