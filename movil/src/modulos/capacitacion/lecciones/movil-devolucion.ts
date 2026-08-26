import type { LeccionCapacitacionMovil } from "../tipos";
import { p, t } from "./definirLeccion";

export const movilDevolucion: LeccionCapacitacionMovil = {
  id: "movil-devolucion",
  pantalla: "devoluciones",
  roles: ["ADMINISTRADOR", "CONTABLE"],
  titulo: t("Autorizar una devolución segura", "Authorize a safe return"),
  resultado: t(
    "Venta preservada, saldo compensado, inventario reintegrado y reembolso ligado a la caja correcta.",
    "Sale preserved, balance offset, stock restored, and refund tied to the correct cash desk.",
  ),
  tipoSimulador: "DEVOLUCION",
  pasos: [
    p(
      "La clienta devuelve mercancía.",
      "Buscar la venta y capturar cantidad, motivo y evidencia",
      "La devolución compensa; nunca borra la venta original.",
      "The customer returns goods.",
      "Find the sale and enter quantity, reason, and evidence",
      "The return offsets; it never deletes the original sale.",
    ),
    p(
      "La solicitud está documentada.",
      "Elegir un autorizador permitido",
      "Sólo Administración o Contabilidad pueden autorizar.",
      "The request is documented.",
      "Choose an authorized approver",
      "Only Administration or Accounting may approve.",
    ),
    p(
      "Existe dinero por reembolsar.",
      "Identificar la caja que realmente entrega el dinero",
      "Autorizador y operador de caja son responsabilidades distintas.",
      "Money must be refunded.",
      "Identify the cash desk that actually issues the money",
      "Approver and cash operator are separate responsibilities.",
    ),
  ],
};
