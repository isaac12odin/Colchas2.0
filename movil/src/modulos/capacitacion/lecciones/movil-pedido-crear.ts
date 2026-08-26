import type { LeccionCapacitacionMovil } from "../tipos";
import { p, t } from "./definirLeccion";

export const movilPedidoCrear: LeccionCapacitacionMovil = {
  id: "movil-pedido-crear",
  pantalla: "pedidos",
  roles: ["ADMINISTRADOR", "CONTABLE", "VENDEDOR", "COBRADOR"],
  titulo: t("Capturar un pedido", "Capture an order"),
  resultado: t(
    "Solicitud pendiente con producto registrado; todavía no crea deuda.",
    "Pending request with a registered product; no debt is created yet.",
  ),
  pasos: [
    p(
      "La clienta solicita algo que no llevas.",
      "Abrir Pedidos y elegir cliente",
      "Un pedido pendiente no es venta.",
      "The customer requests something you do not carry.",
      "Open Orders and select the customer",
      "A pending order is not a sale.",
    ),
    p(
      "Debes definir la mercancía.",
      "Buscar un producto registrado",
      "No se piden descripciones sueltas sin catálogo.",
      "You must define the goods.",
      "Search for a registered product",
      "Free-form uncatalogued goods cannot be ordered.",
    ),
    p(
      "Cantidad y compromiso son correctos.",
      "Guardar pedido pendiente",
      "Después otro rol asignará proveedor.",
      "Quantity and due date are correct.",
      "Save pending order",
      "Another role assigns the supplier next.",
    ),
  ],
};
