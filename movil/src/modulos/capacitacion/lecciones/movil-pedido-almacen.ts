import type { LeccionCapacitacionMovil } from "../tipos";
import { p, t } from "./definirLeccion";

export const movilPedidoAlmacen: LeccionCapacitacionMovil = {
  id: "movil-pedido-almacen",
  pantalla: "pedidos",
  roles: ["ADMINISTRADOR", "ALMACENISTA"],
  titulo: t("Recibir y preparar", "Receive and prepare"),
  resultado: t(
    "Pedido físicamente verificado y listo para entregar.",
    "Physically verified order ready for delivery.",
  ),
  pasos: [
    p(
      "Llegó mercancía del proveedor.",
      "Comparar producto y cantidad",
      "La recepción requiere verificación física.",
      "Goods arrived from the supplier.",
      "Compare product and quantity",
      "Receiving requires physical verification.",
    ),
    p(
      "Todo coincide.",
      "Marcar Recibido en almacén",
      "Vektra registra la fecha de recepción.",
      "Everything matches.",
      "Mark Received in warehouse",
      "Vektra records the receipt date.",
    ),
    p(
      "El paquete está preparado.",
      "Marcar Listo para entrega",
      "Ahora el cobrador puede entregarlo, pero no cambiar proveedor.",
      "The package is prepared.",
      "Mark Ready for delivery",
      "The collector can now deliver it, but cannot change supplier.",
    ),
  ],
};
