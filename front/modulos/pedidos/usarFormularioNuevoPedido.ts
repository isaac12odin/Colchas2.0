import { useState } from "react";

import type { ClientePedido, ProductoPedido } from "./tipos";

export function usarFormularioNuevoPedido() {
  const [paso, establecerPaso] = useState(1);
  const [cliente, establecerCliente] = useState<ClientePedido | null>(null);
  const [producto, establecerProducto] = useState<ProductoPedido | null>(null);
  const [cantidad, establecerCantidad] = useState("1");
  const [fechaCompromiso, establecerFechaCompromiso] = useState("");
  const [creandoProducto, establecerCreandoProducto] = useState(false);
  const cantidadValida =
    Number.isInteger(Number(cantidad)) && Number(cantidad) > 0;

  return {
    paso,
    cliente,
    producto,
    cantidad,
    fechaCompromiso,
    creandoProducto,
    cantidadValida,
    establecerCliente,
    establecerProducto,
    establecerCantidad,
    establecerFechaCompromiso,
    establecerCreandoProducto,
    siguiente: () => establecerPaso((actual) => Math.min(3, actual + 1)),
    anterior: () => establecerPaso((actual) => Math.max(1, actual - 1)),
  };
}

export type ControlNuevoPedido = ReturnType<typeof usarFormularioNuevoPedido>;
