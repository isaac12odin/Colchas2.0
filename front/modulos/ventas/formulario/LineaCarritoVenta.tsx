import { Minus, PackagePlus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";

import {
  dineroVenta,
  type LineaVentaFormulario,
  urlFotoVenta,
} from "./utilidades";

export function LineaCarritoVenta({
  linea,
  es,
  cambiar,
  eliminar,
}: {
  linea: LineaVentaFormulario;
  es: boolean;
  cambiar: (cambio: number) => void;
  eliminar: () => void;
}) {
  const foto = urlFotoVenta(linea.producto);
  return (
    <div
      className="flex items-center gap-3 rounded-xl border p-3"
      data-capacitacion="ventas.carrito.linea"
    >
      {foto ? (
        <Image
          unoptimized
          src={foto}
          alt={linea.producto.nombre}
          width={56}
          height={56}
          className="h-14 w-14 rounded-lg object-cover"
        />
      ) : (
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800">
          <PackagePlus size={22} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-sm">
          {linea.producto.nombre}
        </strong>
        <small className="text-slate-500">
          {dineroVenta.format(Number(linea.producto.precioVenta))} c/u ·{" "}
          {linea.producto.existencia} {es ? "disponibles" : "available"}
        </small>
      </span>
      <div className="flex items-center rounded-lg border">
        <BotonCantidad
          etiqueta={es ? "Restar" : "Decrease"}
          alPulsar={() => cambiar(-1)}
          capacitacion="ventas.carrito.cantidad.restar"
        >
          <Minus size={15} />
        </BotonCantidad>
        <strong
          className="min-w-7 text-center text-sm"
          data-capacitacion="ventas.carrito.cantidad"
        >
          {linea.cantidad}
        </strong>
        <BotonCantidad
          etiqueta={es ? "Sumar" : "Increase"}
          alPulsar={() => cambiar(1)}
          deshabilitado={linea.cantidad >= linea.producto.existencia}
          capacitacion="ventas.carrito.cantidad.sumar"
        >
          <Plus size={15} />
        </BotonCantidad>
      </div>
      <button
        type="button"
        className="p-2 text-red-500"
        onClick={eliminar}
        aria-label={es ? "Eliminar" : "Remove"}
        data-capacitacion="ventas.carrito.eliminar"
      >
        <Trash2 size={17} />
      </button>
    </div>
  );
}

function BotonCantidad({
  etiqueta,
  alPulsar,
  deshabilitado = false,
  children,
  capacitacion,
}: {
  etiqueta: string;
  alPulsar: () => void;
  deshabilitado?: boolean;
  children: React.ReactNode;
  capacitacion:
    | "ventas.carrito.cantidad.restar"
    | "ventas.carrito.cantidad.sumar";
}) {
  return (
    <button
      type="button"
      className="p-2"
      onClick={alPulsar}
      disabled={deshabilitado}
      aria-label={etiqueta}
      data-capacitacion={capacitacion}
    >
      {children}
    </button>
  );
}
