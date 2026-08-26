export interface ProgresoCapacitacion {
  completadas: string[];
  actualizadoEn: string;
}

export interface CapturaPasoPractica {
  primario: string;
  secundario: string;
  archivo: string;
  verificado: boolean;
}

export interface BorradorPracticaLocal {
  pasoActual: number;
  pasoIdActual?: string;
  capturas: Record<string, CapturaPasoPractica>;
  ejecutado: boolean;
  terminada: boolean;
  actualizadoEn: string;
}

export interface AccionPracticaLocal {
  leccionId: string;
  paso: number;
  accion: string;
  valores: string[];
  registradaEn: string;
}

export function claveProgresoCapacitacion(usuarioId: string) {
  return `nexo:capacitacion:${usuarioId}:v2`;
}

function claveBorradorPractica(usuarioId: string, leccionId: string) {
  return `nexo:capacitacion:${usuarioId}:practica:${leccionId}:v3`;
}

function claveHistorialPractica(usuarioId: string) {
  return `nexo:capacitacion:${usuarioId}:acciones:v2`;
}

export function leerProgresoCapacitacion(usuarioId: string) {
  if (typeof window === "undefined") return [];
  try {
    const datos = JSON.parse(
      localStorage.getItem(claveProgresoCapacitacion(usuarioId)) ?? "{}",
    ) as Partial<ProgresoCapacitacion>;
    return Array.isArray(datos.completadas)
      ? datos.completadas.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

export function guardarProgresoCapacitacion(
  usuarioId: string,
  completadas: readonly string[],
) {
  localStorage.setItem(
    claveProgresoCapacitacion(usuarioId),
    JSON.stringify({
      completadas: [...new Set(completadas)],
      actualizadoEn: new Date().toISOString(),
    } satisfies ProgresoCapacitacion),
  );
}

export function leerBorradorPractica(
  usuarioId: string,
  leccionId: string,
): BorradorPracticaLocal | null {
  if (typeof window === "undefined") return null;
  try {
    const valor = JSON.parse(
      localStorage.getItem(claveBorradorPractica(usuarioId, leccionId)) ??
        "null",
    ) as BorradorPracticaLocal | null;
    if (!valor || typeof valor.pasoActual !== "number" || valor.terminada)
      return null;
    return valor;
  } catch {
    return null;
  }
}

export function guardarBorradorPractica(
  usuarioId: string,
  leccionId: string,
  borrador: Omit<BorradorPracticaLocal, "actualizadoEn">,
) {
  localStorage.setItem(
    claveBorradorPractica(usuarioId, leccionId),
    JSON.stringify({
      ...borrador,
      actualizadoEn: new Date().toISOString(),
    } satisfies BorradorPracticaLocal),
  );
}

export function registrarAccionPracticaLocal(
  usuarioId: string,
  accion: Omit<AccionPracticaLocal, "registradaEn">,
) {
  const clave = claveHistorialPractica(usuarioId);
  let actuales: AccionPracticaLocal[] = [];
  try {
    const datos = JSON.parse(localStorage.getItem(clave) ?? "[]") as unknown;
    if (Array.isArray(datos))
      actuales = datos.filter(
        (item): item is AccionPracticaLocal =>
          typeof item === "object" && item !== null && "leccionId" in item,
      );
  } catch {
    actuales = [];
  }
  const valores = accion.valores
    .filter(Boolean)
    .map((valor) => valor.slice(0, 160))
    .slice(0, 6);
  localStorage.setItem(
    clave,
    JSON.stringify(
      [
        ...actuales,
        {
          ...accion,
          valores,
          registradaEn: new Date().toISOString(),
        },
      ].slice(-150),
    ),
  );
}
