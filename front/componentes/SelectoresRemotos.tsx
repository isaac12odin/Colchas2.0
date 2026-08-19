"use client";

import { useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import type { Pagina } from "@/lib/tipos";
import type { ClientePedido, ProductoPedido } from "@/modulos/pedidos/tipos";
import { SelectorBuscable } from "./SelectorBuscable";

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

function usarOpcionesRemotas<T>(ruta: string, termino: string) {
  const [datos, establecerDatos] = useState<T[]>([]);
  useEffect(() => {
    let vigente = true;
    const espera = window.setTimeout(
      () => {
        void api<Pagina<T>>(
          `${ruta}?limite=20&buscar=${encodeURIComponent(termino.trim())}`,
        )
          .then((respuesta) => {
            if (vigente) establecerDatos(respuesta.datos);
          })
          .catch(() => {
            if (vigente) establecerDatos([]);
          });
      },
      termino ? 250 : 0,
    );
    return () => {
      vigente = false;
      window.clearTimeout(espera);
    };
  }, [ruta, termino]);
  return datos;
}

export function SelectorClienteRemoto({
  valor,
  alCambiar,
  es,
}: {
  valor: ClientePedido | null;
  alCambiar: (cliente: ClientePedido | null) => void;
  es: boolean;
}) {
  const [termino, establecerTermino] = useState("");
  const encontrados = usarOpcionesRemotas<ClientePedido>("/clientes", termino);
  const clientes = useMemo(
    () =>
      valor && !encontrados.some((cliente) => cliente.id === valor.id)
        ? [valor, ...encontrados]
        : encontrados,
    [encontrados, valor],
  );
  return (
    <SelectorBuscable
      nombre="clienteId"
      etiqueta={es ? "Cliente" : "Customer"}
      placeholder={
        es
          ? "Nombre, teléfono, dirección, tarjeta o localidad"
          : "Name, phone, address, card, or location"
      }
      opciones={clientes.map((cliente) => ({
        id: cliente.id,
        titulo: cliente.nombreCompleto,
        detalle: `${cliente.telefono} · ${cliente.localidad?.nombre ?? ""}`,
        busqueda: `${cliente.nombreCompleto} ${cliente.telefono} ${cliente.direccion} ${cliente.numeroTarjeta ?? ""} ${cliente.localidad?.nombre ?? ""}`,
      }))}
      valor={valor?.id ?? ""}
      alCambiar={(id) =>
        alCambiar(clientes.find((cliente) => cliente.id === id) ?? null)
      }
      alBuscar={establecerTermino}
      sinResultados={es ? "Cliente no encontrado." : "Customer not found."}
    />
  );
}

export function SelectorProductoRemoto({
  valor,
  alCambiar,
  es,
  requiereExistencia = false,
}: {
  valor: ProductoPedido | null;
  alCambiar: (producto: ProductoPedido | null) => void;
  es: boolean;
  requiereExistencia?: boolean;
}) {
  const [termino, establecerTermino] = useState("");
  const respuesta = usarOpcionesRemotas<ProductoPedido>(
    "/inventario/productos",
    termino,
  );
  const encontrados = respuesta.filter(
    (producto) => !requiereExistencia || producto.existencia > 0,
  );
  const productos =
    valor && !encontrados.some((producto) => producto.id === valor.id)
      ? [valor, ...encontrados]
      : encontrados;
  return (
    <SelectorBuscable
      nombre="productoId"
      etiqueta={es ? "Producto registrado" : "Registered product"}
      placeholder={
        es ? "Producto, marca, SKU o código" : "Product, brand, SKU, or code"
      }
      opciones={productos.map((producto) => ({
        id: producto.id,
        titulo: producto.nombre,
        detalle: `${producto.sku} · ${producto.existencia} en existencia · ${dinero.format(Number(producto.precioVenta))}`,
        busqueda: `${producto.nombre} ${producto.marca} ${producto.sku} ${producto.codigoBarras ?? ""}`,
      }))}
      valor={valor?.id ?? ""}
      alCambiar={(id) =>
        alCambiar(productos.find((producto) => producto.id === id) ?? null)
      }
      alBuscar={establecerTermino}
      sinResultados={
        es
          ? requiereExistencia
            ? "No hay producto con existencia disponible."
            : "Primero registra el producto en Inventario."
          : "Product not found."
      }
    />
  );
}
