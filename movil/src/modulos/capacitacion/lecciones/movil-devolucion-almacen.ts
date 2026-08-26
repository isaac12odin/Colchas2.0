import type { LeccionCapacitacionMovil } from "../tipos";
import { p, t } from "./definirLeccion";

export const movilDevolucionAlmacen: LeccionCapacitacionMovil = {
  id: "movil-devolucion-almacen",
  pantalla: "devoluciones",
  roles: ["ALMACENISTA"],
  titulo: t("Revisar mercancía devuelta", "Inspect returned goods"),
  resultado: t(
    "Mercancía y evidencia verificadas contra la entrada de inventario, sin autorizar ni operar reembolsos.",
    "Goods and evidence verified against the inventory receipt, without approving or issuing refunds.",
  ),
  pasos: [
    p(
      "Llegó una pieza devuelta.",
      "Buscar la devolución por folio, venta o cliente",
      "Almacén consulta una devolución ya autorizada.",
      "A returned item arrived.",
      "Find the return by receipt, sale, or customer",
      "Warehouse reviews an already authorized return.",
    ),
    p(
      "Tienes la mercancía enfrente.",
      "Comparar venta, cantidades, motivo y fotografía",
      "La revisión física debe coincidir con la evidencia.",
      "You have the goods in front of you.",
      "Compare sale, quantities, reason, and photo",
      "Physical inspection must match the evidence.",
    ),
    p(
      "La pieza coincide.",
      "Verificar la entrada compensatoria en inventario",
      "Almacén comprueba el movimiento; no concede autorizaciones ni elige caja.",
      "The item matches.",
      "Verify the compensating inventory receipt",
      "Warehouse verifies the movement; it does not approve or select a cash desk.",
    ),
  ],
};
