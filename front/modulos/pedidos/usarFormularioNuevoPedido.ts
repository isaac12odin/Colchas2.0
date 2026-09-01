import { useMemo, useState } from "react";

import type { ClientePedido, ProductoPedido } from "./tipos";

export interface LineaNuevoPedido {
  producto: ProductoPedido;
  cantidad: string;
}

function esCantidadValida(cantidad: string) {
  const numero = Number(cantidad);
  return Number.isInteger(numero) && numero > 0;
}

function fechaHoyMexico() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Mantiene el borrador y fusiona productos repetidos antes de enviarlos. */
export function usarFormularioNuevoPedido() {
  const [paso, establecerPaso] = useState(1);
  const [cliente, establecerCliente] = useState<ClientePedido | null>(null);
  const [lineas, establecerLineas] = useState<LineaNuevoPedido[]>([]);
  const [fechaCompromiso, establecerFechaCompromiso] = useState("");
  const [creandoProducto, establecerCreandoProducto] = useState(false);
  const [aviso, establecerAviso] = useState("");
  const fechaMinima = fechaHoyMexico();
  const fechaCompromisoValida =
    !fechaCompromiso ||
    (/^\d{4}-\d{2}-\d{2}$/.test(fechaCompromiso) &&
      fechaCompromiso >= fechaMinima);
  const cantidadValida =
    lineas.length > 0 &&
    lineas.every((linea) => esCantidadValida(linea.cantidad));
  const total = useMemo(
    () =>
      lineas.reduce(
        (acumulado, linea) =>
          acumulado +
          Number(linea.producto.precioVenta) *
            (esCantidadValida(linea.cantidad) ? Number(linea.cantidad) : 0),
        0,
      ),
    [lineas],
  );

  function agregarProducto(nuevo: ProductoPedido) {
    const estabaAgregado = lineas.some(
      (linea) => linea.producto.id === nuevo.id,
    );
    establecerLineas((actuales) => {
      const existente = actuales.some(
        (linea) => linea.producto.id === nuevo.id,
      );
      if (existente) {
        return actuales.map((linea) =>
          linea.producto.id === nuevo.id
            ? {
                ...linea,
                cantidad: String(
                  (esCantidadValida(linea.cantidad)
                    ? Number(linea.cantidad)
                    : 0) + 1,
                ),
              }
            : linea,
        );
      }
      return [...actuales, { producto: nuevo, cantidad: "1" }];
    });
    establecerAviso(
      estabaAgregado ? "PRODUCTO_INCREMENTADO" : "PRODUCTO_AGREGADO",
    );
  }

  function seleccionarProducto(nuevo: ProductoPedido | null) {
    if (nuevo) agregarProducto(nuevo);
  }

  function establecerCantidad(productoId: string, cantidad: string) {
    establecerLineas((actuales) =>
      actuales.map((linea) =>
        linea.producto.id === productoId ? { ...linea, cantidad } : linea,
      ),
    );
    establecerAviso("");
  }

  function cambiarCantidad(productoId: string, diferencia: number) {
    establecerLineas((actuales) =>
      actuales.map((linea) => {
        if (linea.producto.id !== productoId) return linea;
        const actual = esCantidadValida(linea.cantidad)
          ? Number(linea.cantidad)
          : 1;
        return {
          ...linea,
          cantidad: String(Math.max(1, actual + diferencia)),
        };
      }),
    );
    establecerAviso("");
  }

  function eliminarProducto(productoId: string) {
    establecerLineas((actuales) =>
      actuales.filter((linea) => linea.producto.id !== productoId),
    );
    establecerAviso("PRODUCTO_ELIMINADO");
  }

  return {
    paso,
    cliente,
    producto: null as ProductoPedido | null,
    lineas,
    fechaCompromiso,
    creandoProducto,
    cantidadValida,
    fechaCompromisoValida,
    fechaMinima,
    total,
    aviso,
    establecerCliente,
    seleccionarProducto,
    agregarProducto,
    establecerCantidad,
    cambiarCantidad,
    eliminarProducto,
    establecerFechaCompromiso,
    establecerCreandoProducto,
    siguiente: () => establecerPaso((actual) => Math.min(3, actual + 1)),
    anterior: () => establecerPaso((actual) => Math.max(1, actual - 1)),
  };
}

export type ControlNuevoPedido = ReturnType<typeof usarFormularioNuevoPedido>;
