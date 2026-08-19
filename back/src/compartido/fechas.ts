import { ErrorAplicacion } from "./errores.js";

const formatoFecha = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Mexico_City",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function fechaMexicoISO(fecha: Date) {
  return formatoFecha.format(fecha);
}

export function validarFechaISO(fecha: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha))
    throw new ErrorAplicacion(
      "FECHA_INVALIDA",
      "Use una fecha valida con formato AAAA-MM-DD.",
      422,
    );
  return fecha;
}

/** Mexico City permanece en UTC-06 por regla federal desde 2022. */
export function rangoDiaMexico(fecha: string) {
  validarFechaISO(fecha);
  return {
    desde: new Date(`${fecha}T00:00:00.000-06:00`),
    hasta: new Date(`${fecha}T23:59:59.999-06:00`),
  };
}

/** Valor estable para columnas PostgreSQL DATE, independiente del huso del host. */
export function fechaOperativa(fecha: string) {
  validarFechaISO(fecha);
  return new Date(`${fecha}T00:00:00.000Z`);
}
