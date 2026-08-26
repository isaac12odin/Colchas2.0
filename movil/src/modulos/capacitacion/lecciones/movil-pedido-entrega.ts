import type { LeccionCapacitacionMovil } from "../tipos";
import { p, t } from "./definirLeccion";

export const movilPedidoEntrega: LeccionCapacitacionMovil = {
  id: "movil-pedido-entrega",
  pantalla: "pedidos",
  roles: ["ADMINISTRADOR", "COBRADOR"],
  titulo: t("Entregar pedido", "Deliver an order"),
  resultado: t(
    "Entrega convertida en venta; crédito, stock y saldo quedan consistentes.",
    "Delivery becomes a sale; credit, stock, and balance remain consistent.",
  ),
  tipoSimulador: "ENTREGA_PEDIDO",
  pasos: [
    p(
      "El pedido está listo.",
      "Revisar artículo y proveedor de sólo lectura",
      "El cobrador confirma trazabilidad, no la modifica.",
      "The order is ready.",
      "Review item and read-only supplier",
      "The collector confirms traceability but cannot change it.",
    ),
    p(
      "La clienta acepta la mercancía.",
      "Elegir contado o crédito y capturar anticipo",
      "Aquí nace la venta y, si aplica, la deuda.",
      "The customer accepts the goods.",
      "Choose cash or credit and enter deposit",
      "This creates the sale and, when applicable, the debt.",
    ),
    p(
      "El resumen es correcto.",
      "Guardar entrega una vez",
      "El folio local permite sincronizar sin duplicar.",
      "The summary is correct.",
      "Save delivery once",
      "The local receipt enables synchronization without duplication.",
    ),
  ],
};
