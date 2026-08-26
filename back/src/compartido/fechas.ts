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

export const MAXIMA_ANTIGUEDAD_OPERACION_MS = 36 * 60 * 60 * 1000;
export const MAXIMO_ADELANTO_RELOJ_MS = 10 * 60 * 1000;
export const DIFERENCIA_RELOJ_ALERTA_MS = 30 * 60 * 1000;

/**
 * Separa las tres autoridades temporales de una operación monetaria. La hora
 * capturada explica el trabajo de campo, pero el corte usa siempre el día en
 * que el servidor aceptó la operación; así el cliente no puede mover caja.
 */
export function contextoFechaOperacion(
  capturadaEnCliente: Date,
  recibidaEnServidor = new Date(),
) {
  return {
    capturadaEnCliente,
    recibidaEnServidor,
    fechaOperativa: fechaOperativa(fechaMexicoISO(recibidaEnServidor)),
    diferenciaRelojSegundos: Math.round(
      (recibidaEnServidor.getTime() - capturadaEnCliente.getTime()) / 1000,
    ),
  };
}

export function requiereAlertaReloj(diferenciaRelojSegundos: number) {
  return Math.abs(diferenciaRelojSegundos * 1000) > DIFERENCIA_RELOJ_ALERTA_MS;
}

/** Convierte una columna DATE de Prisma sin desplazarla a la zona del host. */
export function fechaISODesdeDateDb(fecha: Date) {
  return fecha.toISOString().slice(0, 10);
}

/**
 * Las fechas del móvil conservan el momento de trabajo offline, pero no son
 * autoridad ilimitada. Se acepta una jornada completa sin red y un margen
 * pequeño de reloj adelantado. Una jornada ya cerrada conserva la última
 * palabra mediante asegurarJornadaAbierta.
 */
export function validarFechaMonetaria(
  fecha: Date,
  ahora = new Date(),
  nombre = "La fecha de la operación",
) {
  const tiempo = fecha.getTime();
  if (!Number.isFinite(tiempo))
    throw new ErrorAplicacion(
      "FECHA_OPERACION_INVALIDA",
      `${nombre} no es válida.`,
      422,
    );
  if (tiempo > ahora.getTime() + MAXIMO_ADELANTO_RELOJ_MS)
    throw new ErrorAplicacion(
      "RELOJ_ADELANTADO",
      `${nombre} está demasiado adelantada. Corrija la hora del equipo.`,
      422,
    );
  if (tiempo < ahora.getTime() - MAXIMA_ANTIGUEDAD_OPERACION_MS)
    throw new ErrorAplicacion(
      "OPERACION_DEMASIADO_ANTIGUA",
      `${nombre} supera la ventana offline de 36 horas y requiere revisión administrativa.`,
      422,
    );
  return fecha;
}

export function validarPrimerVencimiento(
  fechaOperacion: Date,
  primerVencimiento: Date,
) {
  if (primerVencimiento.getTime() < fechaOperacion.getTime())
    throw new ErrorAplicacion(
      "VENCIMIENTO_ANTERIOR_OPERACION",
      "El primer vencimiento no puede ser anterior a la venta o entrega.",
      422,
    );
  return primerVencimiento;
}

export function validarFechaPlaneada(
  fecha: Date,
  referencia = new Date(),
  nombre = "La fecha planeada",
) {
  if (!Number.isFinite(fecha.getTime()))
    throw new ErrorAplicacion(
      "FECHA_PLANEADA_INVALIDA",
      `${nombre} no es válida.`,
      422,
    );
  if (fechaMexicoISO(fecha) < fechaMexicoISO(referencia))
    throw new ErrorAplicacion(
      "FECHA_PLANEADA_PASADA",
      `${nombre} no puede quedar en el pasado.`,
      422,
    );
  return fecha;
}
