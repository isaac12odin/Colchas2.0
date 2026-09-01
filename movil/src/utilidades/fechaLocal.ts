function dosDigitos(valor: number) {
  return String(valor).padStart(2, "0");
}

/** Fecha de calendario del dispositivo, sin convertir primero a UTC. */
export function fechaCalendarioLocal(fecha = new Date()) {
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
}

export function sumarDiasCalendarioLocal(dias: number, origen = new Date()) {
  const siguiente = new Date(origen);
  siguiente.setHours(12, 0, 0, 0);
  siguiente.setDate(siguiente.getDate() + dias);
  return fechaCalendarioLocal(siguiente);
}

/** Se evalúa al abrir el formulario, no cuando JavaScript carga el módulo. */
export function fechaSugeridaPlanPago(ahora = new Date()) {
  return sumarDiasCalendarioLocal(7, ahora);
}

export function esFechaCalendarioValida(valor: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [ano, mes, dia] = valor.split("-").map(Number);
  const fecha = new Date(ano, mes - 1, dia, 12, 0, 0, 0);
  return (
    fecha.getFullYear() === ano &&
    fecha.getMonth() === mes - 1 &&
    fecha.getDate() === dia
  );
}

export function esFechaHoyOFutura(valor: string, hoy = fechaCalendarioLocal()) {
  return esFechaCalendarioValida(valor) && valor >= hoy;
}

/**
 * Conserva la fecha elegida y la envía al final del día operativo de México.
 * Así un vencimiento de "hoy" no queda accidentalmente antes que una venta
 * capturada por la tarde.
 */
export function finDiaMexicoISO(valor: string) {
  return new Date(`${valor}T23:59:59.999-06:00`).toISOString();
}
