import type { Rol } from "@/lib/tipos";

export type PlataformaCapacitacion = "WEB" | "MOVIL";
export type TipoSimuladorCapacitacion =
  | "VENTA_CREDITO"
  | "ABONO"
  | "ENTREGA_PEDIDO"
  | "DEVOLUCION"
  | "SINCRONIZACION_CORRECCION";
export type TextoCapacitacion = { es: string; en: string };

export interface PasoCapacitacion {
  instruccion: TextoCapacitacion;
  accion: TextoCapacitacion;
  explicacion: TextoCapacitacion;
}

export type EventoPasoAtomico =
  | "lectura"
  | "click"
  | "input"
  | "select"
  | "check"
  | "upload"
  | "reordenar"
  | "mutacion-local";

export interface ObjetivoPasoAtomico {
  /** Clave estable expuesta por la pantalla con data-capacitacion. */
  control: string;
  evento: EventoPasoAtomico;
  controlesAuxiliares?: readonly string[];
  /** Exige que todos los controles con la misma clave tengan un valor válido. */
  requerirTodosValidos?: boolean;
  /** Restringe el objetivo al ID capturado por la mutación del paso anterior. */
  usarEntidadActiva?: boolean;
  numeroMinimo?: number;
  mutacion?: {
    metodo: "POST" | "PATCH" | "DELETE";
    ruta: string;
  };
}

/**
 * Un paso de práctica representa una sola acción verificable. El ejemplo se
 * presenta antes de habilitar el control real, nunca se copia automáticamente.
 */
export interface PasoAtomicoCapacitacion {
  id: string;
  titulo: TextoCapacitacion;
  ubicacion: TextoCapacitacion;
  antesDeActuar: TextoCapacitacion;
  microEjemplo: TextoCapacitacion;
  accion: TextoCapacitacion;
  verificacion: TextoCapacitacion;
  objetivo: ObjetivoPasoAtomico;
}

export interface LeccionCapacitacion {
  id: string;
  pantalla: string;
  plataforma: PlataformaCapacitacion;
  roles: readonly Rol[];
  titulo: TextoCapacitacion;
  objetivo: TextoCapacitacion;
  resultado: TextoCapacitacion;
  responsable: TextoCapacitacion;
  tipoSimulador?: TipoSimuladorCapacitacion;
  rutaReal?: string;
  pasos: readonly PasoCapacitacion[];
}

export function localizar(texto: TextoCapacitacion, idioma: "es" | "en") {
  return texto[idioma];
}
