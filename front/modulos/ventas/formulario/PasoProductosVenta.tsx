import { ChevronLeft, ShoppingCart } from "lucide-react";

import {
  SelectorClienteRemoto,
  SelectorProductoRemoto,
} from "@/componentes/SelectoresRemotos";
import type { ClientePedido, ProductoPedido } from "@/modulos/pedidos/tipos";
import { LineaCarritoVenta } from "./LineaCarritoVenta";
import { dineroVenta, type LineaVentaFormulario } from "./utilidades";

export function PasoProductosVenta({
  es,
  esCredito,
  cliente,
  productoElegido,
  lineas,
  subtotal,
  puedeContinuar,
  alCambiarCliente,
  alAgregarProducto,
  alCambiarCantidad,
  alAtras,
  alContinuar,
}: {
  es: boolean;
  esCredito: boolean;
  cliente: ClientePedido | null;
  productoElegido: ProductoPedido | null;
  lineas: LineaVentaFormulario[];
  subtotal: number;
  puedeContinuar: boolean;
  alCambiarCliente: (cliente: ClientePedido | null) => void;
  alAgregarProducto: (producto: ProductoPedido | null) => void;
  alCambiarCantidad: (productoId: string, cambio: number) => void;
  alAtras: () => void;
  alContinuar: () => void;
}) {
  return (
    <section className="space-y-5 py-3" data-capacitacion="ventas.productos">
      <div className="rounded-xl border p-4" data-capacitacion="ventas.cliente">
        <SelectorClienteRemoto
          valor={cliente}
          alCambiar={alCambiarCliente}
          es={es}
          prefijoCapacitacion="ventas.cliente"
        />
        <p className="mt-2 text-xs text-slate-500">
          {esCredito
            ? es
              ? "Obligatorio para conocer el saldo, tarjeta y plan de cobro."
              : "Required to load the balance, card, and payment plan."
            : es
              ? "Opcional. Déjalo vacío para registrar público general."
              : "Optional. Leave it empty for a general-public sale."}
        </p>
      </div>
      <div
        className="rounded-xl border p-4"
        data-capacitacion="ventas.producto"
      >
        <SelectorProductoRemoto
          valor={productoElegido}
          alCambiar={alAgregarProducto}
          es={es}
          requiereExistencia
          prefijoCapacitacion="ventas.producto"
        />
      </div>
      <div className="space-y-2" data-capacitacion="ventas.carrito">
        {lineas.map((linea) => (
          <LineaCarritoVenta
            key={linea.producto.id}
            linea={linea}
            es={es}
            cambiar={(cambio) => alCambiarCantidad(linea.producto.id, cambio)}
            eliminar={() =>
              alCambiarCantidad(linea.producto.id, -linea.cantidad)
            }
          />
        ))}
        {!lineas.length && (
          <div
            className="grid min-h-28 place-items-center rounded-xl border border-dashed text-center text-sm text-slate-500"
            data-capacitacion="ventas.carrito.vacio"
          >
            <span>
              <ShoppingCart className="mx-auto mb-2" size={24} />
              {es
                ? "Busca un producto registrado para agregarlo."
                : "Find a registered product to add it."}
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-between">
        <button
          type="button"
          className="boton-secundario"
          onClick={alAtras}
          data-capacitacion="ventas.productos.atras"
        >
          <ChevronLeft size={17} /> {es ? "Atrás" : "Back"}
        </button>
        <button
          type="button"
          className="boton-primario"
          disabled={!puedeContinuar}
          onClick={alContinuar}
          data-capacitacion="ventas.productos.revisar"
        >
          {es ? "Revisar venta" : "Review sale"} ·{" "}
          {dineroVenta.format(subtotal)}
        </button>
      </div>
    </section>
  );
}
