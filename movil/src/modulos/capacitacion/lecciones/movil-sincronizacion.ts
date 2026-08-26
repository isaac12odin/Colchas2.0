import type { LeccionCapacitacionMovil } from "../tipos";
import { p, t } from "./definirLeccion";

export const movilSincronizacion: LeccionCapacitacionMovil = {
  id: "movil-sincronizacion",
  pantalla: "sincronizacion",
  roles: ["ADMINISTRADOR", "COBRADOR"],
  titulo: t("Confirmar trabajo offline", "Confirm offline work"),
  resultado: t(
    "Pendientes aceptados o conflictos explicados, nunca eliminados a ciegas.",
    "Pending work accepted or conflicts explained, never blindly deleted.",
  ),
  tipoSimulador: "SINCRONIZACION_CORRECCION",
  pasos: [
    p(
      "Recuperaste señal.",
      "Abrir Sincronización",
      "La pantalla enumera movimientos protegidos en este equipo.",
      "Connectivity returned.",
      "Open Synchronization",
      "The screen lists protected movements on this device.",
    ),
    p(
      "Hay varias operaciones.",
      "Enviar pendientes y esperar respuesta",
      "Cada movimiento conserva su identificador idempotente.",
      "There are several operations.",
      "Send pending operations and await response",
      "Each movement preserves its idempotency identifier.",
    ),
    p(
      "Una operación muestra conflicto.",
      "Leer la causa y conservarla para revisión",
      "Un conflicto no se borra ni se fuerza silenciosamente.",
      "An operation shows a conflict.",
      "Read the reason and keep it for review",
      "A conflict is not deleted or silently forced.",
    ),
  ],
};
