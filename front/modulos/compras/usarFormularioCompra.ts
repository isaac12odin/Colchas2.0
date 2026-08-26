import { useMemo, useState, type FormEvent } from "react";

import type { LineaCompra, NuevaCompraWeb } from "./tipos";

function nuevaLinea(): LineaCompra {
  return {
    id: crypto.randomUUID(),
    producto: null,
    cantidad: "1",
    costo: "",
    itemPedidoId: "",
  };
}

export function usarFormularioCompra({
  alGuardar,
}: {
  alGuardar: (datos: NuevaCompraWeb) => Promise<void>;
}) {
  const [paso, establecerPaso] = useState(1);
  const [proveedorId, establecerProveedorId] = useState("");
  const [fechaCompra, establecerFechaCompra] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [notas, establecerNotas] = useState("");
  const [lineas, establecerLineas] = useState<LineaCompra[]>([nuevaLinea()]);

  const total = useMemo(
    () =>
      lineas.reduce(
        (suma, linea) =>
          suma + Number(linea.cantidad || 0) * Number(linea.costo || 0),
        0,
      ),
    [lineas],
  );
  const productos = lineas.map((linea) => linea.producto?.id).filter(Boolean);
  const productosRepetidos = new Set(productos).size !== productos.length;
  const lineasValidas =
    lineas.length > 0 &&
    !productosRepetidos &&
    lineas.every(
      (linea) =>
        linea.producto &&
        Number.isInteger(Number(linea.cantidad)) &&
        Number(linea.cantidad) > 0 &&
        Number(linea.costo) > 0,
    );

  function cambiarLinea(id: string, cambios: Partial<LineaCompra>) {
    establecerLineas((actuales) =>
      actuales.map((linea) =>
        linea.id === id ? { ...linea, ...cambios } : linea,
      ),
    );
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (paso !== 3 || !proveedorId || !fechaCompra || !lineasValidas) return;
    await alGuardar({
      proveedorId,
      fechaCompra: new Date(`${fechaCompra}T12:00:00`).toISOString(),
      notas: notas.trim() || undefined,
      items: lineas.map((linea) => ({
        productoId: linea.producto!.id,
        cantidad: Number(linea.cantidad),
        costoUnitario: Number(linea.costo),
        ...(linea.itemPedidoId ? { itemPedidoId: linea.itemPedidoId } : {}),
      })),
    });
  }

  return {
    paso,
    proveedorId,
    fechaCompra,
    notas,
    lineas,
    total,
    productosRepetidos,
    lineasValidas,
    establecerProveedorId,
    establecerFechaCompra,
    establecerNotas,
    cambiarLinea,
    agregarLinea: () =>
      establecerLineas((actuales) => [...actuales, nuevaLinea()]),
    eliminarLinea: (id: string) =>
      establecerLineas((actuales) =>
        actuales.filter((linea) => linea.id !== id),
      ),
    siguiente: () => establecerPaso((actual) => Math.min(3, actual + 1)),
    anterior: () => establecerPaso((actual) => Math.max(1, actual - 1)),
    enviar,
  };
}

export type ControlFormularioCompra = ReturnType<typeof usarFormularioCompra>;
