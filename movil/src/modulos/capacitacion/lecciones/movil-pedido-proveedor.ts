import type { LeccionCapacitacionMovil } from "../tipos";
import { p, t } from "./definirLeccion";

export const movilPedidoProveedor: LeccionCapacitacionMovil = {
  id: "movil-pedido-proveedor",
  pantalla: "pedidos",
  roles: ["ADMINISTRADOR", "CONTABLE", "ALMACENISTA"],
  titulo: t("Asignar proveedor al pedido", "Assign supplier to order"),
  resultado: t(
    "Cada artículo queda ligado a quien lo surtirá.",
    "Every item is linked to its supplier.",
  ),
  pasos: [
    p(
      "El pedido está Pendiente de pedir.",
      "Abrir Asignar proveedor",
      "Esta responsabilidad no pertenece al cobrador.",
      "The order is Pending supplier order.",
      "Open Assign supplier",
      "This responsibility does not belong to the collector.",
    ),
    p(
      "Hay más de un artículo.",
      "Elegir proveedor en cada línea",
      "La trazabilidad se guarda por artículo.",
      "There is more than one item.",
      "Choose a supplier for each line",
      "Traceability is stored per item.",
    ),
    p(
      "Todas las líneas están completas y hay conexión.",
      "Confirmar pedido al proveedor",
      "La asignación se valida en el servidor para evitar inconsistencias.",
      "Every line is complete and online.",
      "Confirm supplier order",
      "Assignment is server-validated to prevent inconsistencies.",
    ),
  ],
};
