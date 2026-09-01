"use client";

import {
  AlertTriangle,
  Barcode,
  Edit3,
  ImageIcon,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import Image from "next/image";

import type { ProductoInventario } from "./tipos";
import { urlFotoProducto } from "./tipos";

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export function TarjetaProducto({
  producto,
  es,
  puedeGestionar,
  alEditar,
  alAjustar,
  alDarDeBaja,
}: {
  producto: ProductoInventario;
  es: boolean;
  puedeGestionar: boolean;
  alEditar: () => void;
  alAjustar: () => void;
  alDarDeBaja: () => void;
}) {
  const foto = urlFotoProducto(producto);
  const bajo = producto.existencia <= producto.existenciaMinima;
  return (
    <article
      className="panel overflow-hidden"
      data-capacitacion="inventario.lista.producto"
    >
      <div className="flex gap-4 p-4">
        <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800">
          {foto ? (
            <Image
              unoptimized
              src={foto}
              alt={producto.nombre}
              width={112}
              height={112}
              className="h-full w-full object-cover"
            />
          ) : (
            <ImageIcon size={30} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate font-bold">{producto.nombre}</h2>
              <p className="truncate text-xs text-slate-500">
                {producto.marca} · {producto.sku}
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${bajo ? "bg-red-100 text-red-700 dark:bg-red-950" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950"}`}
            >
              {producto.existencia} {es ? "pzas." : "pcs."}
            </span>
          </div>
          <p className="mt-3 text-xl font-bold text-blue-700 dark:text-blue-300">
            {dinero.format(Number(producto.precioVenta))}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
            <Barcode size={14} />{" "}
            {producto.codigoBarras ??
              (es ? "Sin código de barras" : "No barcode")}
          </p>
          {bajo && (
            <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-red-600">
              <AlertTriangle size={14} /> {es ? "Inventario bajo" : "Low stock"}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-t bg-slate-50 px-4 py-3 dark:bg-slate-950">
        <span className="text-xs text-slate-500">
          {es ? "Costo" : "Cost"} {dinero.format(Number(producto.precioCompra))}
        </span>
        {puedeGestionar && (
          <div className="flex gap-2">
            <button
              type="button"
              className="boton-secundario px-3"
              onClick={alEditar}
              title={es ? "Editar producto" : "Edit product"}
              aria-label={
                es ? `Editar ${producto.nombre}` : `Edit ${producto.nombre}`
              }
              data-capacitacion="inventario.producto.editar-abrir"
            >
              <Edit3 size={16} />
            </button>
            <button
              type="button"
              className="boton-secundario px-3"
              onClick={alAjustar}
              title={es ? "Ajustar existencia" : "Adjust stock"}
              aria-label={
                es
                  ? `Ajustar existencia de ${producto.nombre}`
                  : `Adjust stock for ${producto.nombre}`
              }
              data-capacitacion="inventario.ajuste.abrir"
            >
              <SlidersHorizontal size={16} />
            </button>
            <button
              type="button"
              className="boton-secundario px-3 text-red-600"
              onClick={alDarDeBaja}
              title={es ? "Dar de baja" : "Deactivate"}
              aria-label={
                es
                  ? `Dar de baja ${producto.nombre}`
                  : `Deactivate ${producto.nombre}`
              }
              data-capacitacion="inventario.baja.abrir"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
