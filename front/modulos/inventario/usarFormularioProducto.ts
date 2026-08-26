import { useState, type FormEvent } from "react";

import type { CambioFotoProducto } from "./CampoFotoProducto";
import type { DatosProductoWeb, ProductoInventario } from "./tipos";

export interface ValoresProducto {
  nombre: string;
  marca: string;
  sku: string;
  categoriaId: string;
  codigoBarras: string;
  codigoQr: string;
  precioCompra: string;
  precioVenta: string;
  existenciaInicial: string;
  existenciaMinima: string;
}

export function usarFormularioProducto({
  producto,
  alGuardar,
}: {
  producto?: ProductoInventario | null;
  alGuardar: (datos: DatosProductoWeb) => Promise<void>;
}) {
  const [paso, establecerPaso] = useState(1);
  const [cambioFoto, establecerCambioFoto] = useState<CambioFotoProducto>({
    eliminarFoto: false,
  });
  const [valores, establecerValores] = useState<ValoresProducto>({
    nombre: producto?.nombre ?? "",
    marca: producto?.marca ?? "",
    sku: producto?.sku ?? "",
    categoriaId: producto?.categoriaId ?? "",
    codigoBarras: producto?.codigoBarras ?? "",
    codigoQr: producto?.codigoQr ?? "",
    precioCompra: producto?.precioCompra ?? "",
    precioVenta: producto?.precioVenta ?? "",
    existenciaInicial: "0",
    existenciaMinima: String(producto?.existenciaMinima ?? 0),
  });

  const precioCompra = Number(valores.precioCompra || 0);
  const precioVenta = Number(valores.precioVenta || 0);
  const identidadValida = Boolean(
    valores.nombre.trim().length >= 2 &&
      valores.marca.trim() &&
      valores.sku.trim().length >= 2 &&
      valores.categoriaId,
  );
  const preciosValidos =
    precioCompra >= 0 && precioVenta > 0 && precioVenta >= precioCompra;
  const existenciaValida =
    Number.isInteger(Number(valores.existenciaInicial)) &&
    Number(valores.existenciaInicial) >= 0 &&
    Number.isInteger(Number(valores.existenciaMinima)) &&
    Number(valores.existenciaMinima) >= 0;
  const utilidad = precioVenta - precioCompra;
  const margen = precioVenta > 0 ? (utilidad / precioVenta) * 100 : 0;

  function cambiar(campo: keyof ValoresProducto, valor: string) {
    establecerValores((actuales) => ({ ...actuales, [campo]: valor }));
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (paso < 3) return;
    await alGuardar({
      sku: valores.sku.trim(),
      nombre: valores.nombre.trim(),
      marca: valores.marca.trim(),
      categoriaId: valores.categoriaId,
      codigoBarras: valores.codigoBarras.trim() || null,
      codigoQr: valores.codigoQr.trim() || null,
      ...(!producto
        ? { existenciaInicial: Number(valores.existenciaInicial) }
        : {}),
      existenciaMinima: Number(valores.existenciaMinima),
      precioCompra,
      precioVenta,
      ...(cambioFoto.foto ? { foto: cambioFoto.foto } : {}),
      ...(cambioFoto.eliminarFoto ? { eliminarFoto: true } : {}),
    });
  }

  return {
    paso,
    valores,
    identidadValida,
    preciosValidos,
    existenciaValida,
    utilidad,
    margen,
    establecerCambioFoto,
    cambiar,
    siguiente: () => establecerPaso((actual) => Math.min(3, actual + 1)),
    anterior: () => establecerPaso((actual) => Math.max(1, actual - 1)),
    enviar,
  };
}

export type ControlFormularioProducto = ReturnType<
  typeof usarFormularioProducto
>;
