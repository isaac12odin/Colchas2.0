import type { LeccionCapacitacionMovil } from "../tipos";
import { p, t } from "./definirLeccion";

export const movilAbono: LeccionCapacitacionMovil = {
  id: "movil-abono",
  pantalla: "jornada",
  roles: ["ADMINISTRADOR", "COBRADOR"],
  titulo: t("Registrar un abono en campo", "Record a field payment"),
  resultado: t(
    "Saldo local proyectado y movimiento listo para sincronizar.",
    "Projected local balance and movement ready to sync.",
  ),
  tipoSimulador: "ABONO",
  pasos: [
    p(
      "Agenda indica que una clienta paga hoy.",
      "Abrir Rutas, entrar a la jornada y tocar la tarjeta de la clienta",
      "La tarjeta muestra monto de hoy, vencido y saldo antes de registrar dinero.",
      "Schedule shows a customer is due today.",
      "Open Routes, enter the workday, and tap the customer card",
      "The card shows due today, overdue, and balance before recording money.",
    ),
    p(
      "Recibes efectivo o transferencia.",
      "Tocar Pagó, capturar monto y elegir Efectivo o Transferencia",
      "Revisa el saldo que quedará y toca Guardar una sola vez.",
      "You receive cash or transfer.",
      "Enter amount and method",
      "The method supports closing reconciliation.",
    ),
    p(
      "No hay señal.",
      "Guardar una sola vez y conservar folio local",
      "La operación cifrada no se duplica al sincronizar.",
      "There is no signal.",
      "Save once and keep the local receipt",
      "The encrypted operation is not duplicated during sync.",
    ),
  ],
};
