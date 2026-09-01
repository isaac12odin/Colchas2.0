import type { LeccionCapacitacionMovil } from "../tipos";
import { p, t } from "./definirLeccion";

export const movilDevolucionAlmacen: LeccionCapacitacionMovil = {
  id: "movil-devolucion-almacen",
  pantalla: "inventario",
  roles: ["ALMACENISTA"],
  titulo: t("Revisar mercancía devuelta", "Inspect returned goods"),
  resultado: t(
    "Mercancía y evidencia verificadas contra la entrada de inventario, sin autorizar ni operar reembolsos.",
    "Goods and evidence verified against the inventory receipt, without approving or issuing refunds.",
  ),
  pasos: [
    p(
      "Llegó una pieza devuelta.",
      "Confirmar que el folio de devolución ya fue autorizado",
      "La autorización y el reembolso pertenecen a Administración o Contabilidad; Almacén recibe el folio.",
      "A returned item arrived.",
      "Confirm that the return receipt was already approved",
      "Approval and refund belong to Administration or Accounting; Warehouse receives the receipt.",
    ),
    p(
      "Tienes la mercancía enfrente.",
      "Abrir Inventario y buscar el producto por nombre, SKU o código",
      "Usas la pantalla real de Inventario y no una autorización que tu rol no posee.",
      "You have the goods in front of you.",
      "Open Inventory and find the item by name, SKU, or code",
      "You use the real Inventory screen, not an approval action your role does not have.",
    ),
    p(
      "La pieza coincide.",
      "Verificar que la existencia incluya la pieza reintegrada",
      "Si la cifra no coincide, reporta el folio; no ajustes stock ni caja para ocultar la diferencia.",
      "The item matches.",
      "Verify that stock includes the restored unit",
      "If it does not match, report the receipt; never alter stock or cash to hide the discrepancy.",
    ),
  ],
};
