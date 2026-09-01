const VERSION_PROGRESO = 3;
const VERSION_SESION = 4;
const PREFIJO_LEGACY = "nexo:capacitacion:";
const ID_SEGURO = /^[a-zA-Z0-9_-]{1,100}$/;

export interface ProgresoCapacitacion {
  version: typeof VERSION_PROGRESO;
  usuarioId: string;
  completadas: string[];
  actualizadoEn: string;
}

export interface CapturaPasoPractica {
  primario: string;
  secundario: string;
  archivo: string;
  verificado: boolean;
}

/**
 * Únicamente estado de navegación no sensible. Los campos escritos por la
 * persona viven en React y desaparecen al cerrar o recargar la práctica.
 */
export interface BorradorPracticaLocal {
  version: typeof VERSION_SESION;
  usuarioId: string;
  leccionId: string;
  pasoActual: number;
  pasoIdActual?: string;
  ejecutado: boolean;
  terminada: boolean;
  actualizadoEn: string;
}

export interface AccionPracticaLocal {
  leccionId: string;
  paso: number;
  accion: string;
  registradaEn: string;
}

const accionesEnMemoria = new Map<string, AccionPracticaLocal[]>();
let almacenamientoLegacyRevisado = false;

function idCodificado(id: string) {
  return encodeURIComponent(id.slice(0, 120));
}

export function claveProgresoCapacitacion(usuarioId: string) {
  return `vektra:capacitacion:v${VERSION_PROGRESO}:progreso:${idCodificado(usuarioId)}`;
}

function claveBorradorPractica(usuarioId: string, leccionId: string) {
  return `vektra:capacitacion:v${VERSION_SESION}:sesion:${idCodificado(usuarioId)}:${idCodificado(leccionId)}`;
}

/** Elimina formatos anteriores que podían contener campos operativos. */
export function limpiarPersistenciaCapacitacionLegacy() {
  if (typeof window === "undefined" || almacenamientoLegacyRevisado) return;
  almacenamientoLegacyRevisado = true;
  try {
    for (let indice = localStorage.length - 1; indice >= 0; indice -= 1) {
      const clave = localStorage.key(indice);
      if (clave?.startsWith(PREFIJO_LEGACY)) localStorage.removeItem(clave);
    }
  } catch {
    // El navegador puede bloquear el almacenamiento; la capacitación continúa
    // en memoria sin debilitar la operación real.
  }
}

function idsValidos(valores: unknown): string[] {
  if (!Array.isArray(valores)) return [];
  return [
    ...new Set(
      valores.filter(
        (valor): valor is string =>
          typeof valor === "string" && ID_SEGURO.test(valor),
      ),
    ),
  ].slice(0, 200);
}

export function leerProgresoCapacitacion(usuarioId: string) {
  if (typeof window === "undefined") return [];
  limpiarPersistenciaCapacitacionLegacy();
  try {
    const datos = JSON.parse(
      localStorage.getItem(claveProgresoCapacitacion(usuarioId)) ?? "{}",
    ) as Partial<ProgresoCapacitacion>;
    if (datos.version !== VERSION_PROGRESO || datos.usuarioId !== usuarioId)
      return [];
    return idsValidos(datos.completadas);
  } catch {
    return [];
  }
}

export function guardarProgresoCapacitacion(
  usuarioId: string,
  completadas: readonly string[],
) {
  if (typeof window === "undefined") return;
  limpiarPersistenciaCapacitacionLegacy();
  try {
    localStorage.setItem(
      claveProgresoCapacitacion(usuarioId),
      JSON.stringify({
        version: VERSION_PROGRESO,
        usuarioId,
        completadas: idsValidos(completadas),
        actualizadoEn: new Date().toISOString(),
      } satisfies ProgresoCapacitacion),
    );
  } catch {
    // El progreso es una conveniencia local; nunca debe bloquear la operación.
  }
}

export function leerBorradorPractica(
  usuarioId: string,
  leccionId: string,
): BorradorPracticaLocal | null {
  if (typeof window === "undefined") return null;
  limpiarPersistenciaCapacitacionLegacy();
  try {
    const valor = JSON.parse(
      sessionStorage.getItem(claveBorradorPractica(usuarioId, leccionId)) ??
        "null",
    ) as BorradorPracticaLocal | null;
    if (
      !valor ||
      valor.version !== VERSION_SESION ||
      valor.usuarioId !== usuarioId ||
      valor.leccionId !== leccionId ||
      !Number.isInteger(valor.pasoActual) ||
      valor.pasoActual < 0 ||
      valor.terminada
    )
      return null;
    return valor;
  } catch {
    return null;
  }
}

export function guardarBorradorPractica(
  usuarioId: string,
  leccionId: string,
  borrador: Pick<
    BorradorPracticaLocal,
    "pasoActual" | "pasoIdActual" | "ejecutado" | "terminada"
  >,
) {
  if (typeof window === "undefined") return;
  limpiarPersistenciaCapacitacionLegacy();
  try {
    sessionStorage.setItem(
      claveBorradorPractica(usuarioId, leccionId),
      JSON.stringify({
        version: VERSION_SESION,
        usuarioId,
        leccionId,
        pasoActual: Math.max(0, Math.trunc(borrador.pasoActual)),
        pasoIdActual:
          typeof borrador.pasoIdActual === "string" &&
          ID_SEGURO.test(borrador.pasoIdActual)
            ? borrador.pasoIdActual
            : undefined,
        ejecutado: Boolean(borrador.ejecutado),
        terminada: Boolean(borrador.terminada),
        actualizadoEn: new Date().toISOString(),
      } satisfies BorradorPracticaLocal),
    );
  } catch {
    // La práctica sigue funcionando en memoria si no hay sessionStorage.
  }
}

/**
 * Telemetría efímera de la sesión. `valores` se acepta por compatibilidad con
 * los llamadores, pero jamás se conserva ni se serializa.
 */
export function registrarAccionPracticaLocal(
  usuarioId: string,
  accion: Omit<AccionPracticaLocal, "registradaEn"> & {
    valores?: readonly string[];
  },
) {
  const actuales = accionesEnMemoria.get(usuarioId) ?? [];
  accionesEnMemoria.set(
    usuarioId,
    [
      ...actuales,
      {
        leccionId: accion.leccionId,
        paso: accion.paso,
        accion: accion.accion,
        registradaEn: new Date().toISOString(),
      },
    ].slice(-150),
  );
}
