import type { LeccionCapacitacionMovil } from "../tipos";
import { p, t } from "./definirLeccion";

export const movilRuta: LeccionCapacitacionMovil = {
  id: "movil-ruta",
  pantalla: "rutas",
  roles: ["ADMINISTRADOR", "COBRADOR"],
  titulo: t("Cobrar una ruta", "Collect a route"),
  resultado: t(
    "Cada visita queda como pagó, no pagó o pendiente.",
    "Every visit is recorded as paid, unpaid, or pending.",
  ),
  pasos: [
    p(
      "Comienza tu día.",
      "Abrir la ruta asignada y descargar la jornada",
      "Sólo recibes clientes autorizados para esa ruta.",
      "Your day begins.",
      "Open the assigned route and download the workday",
      "You only receive customers authorized for that route.",
    ),
    p(
      "Llegas con una clienta.",
      "Confirmar nombre, dirección y saldo",
      "Dos datos reducen errores de identidad.",
      "You reach a customer.",
      "Confirm name, address, and balance",
      "Two details reduce identity errors.",
    ),
    p(
      "Terminaste la visita.",
      "Registrar el resultado aunque no haya abono",
      "El historial de no pago alimenta riesgo y seguimiento.",
      "The visit is complete.",
      "Record the result even without payment",
      "No-payment history feeds risk and follow-up.",
    ),
  ],
};
