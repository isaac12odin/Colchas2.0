import { Plus, X } from "lucide-react";

import { SelectorProductoRemoto } from "@/componentes/SelectoresRemotos";
import type { PedidoPendienteCompra } from "./tipos";
import type { ControlFormularioCompra } from "./usarFormularioCompra";

export function PasoArticulosCompra({
  control,
  pedidos,
  es,
}: {
  control: ControlFormularioCompra;
  pedidos: PedidoPendienteCompra[];
  es: boolean;
}) {
  return (
    <section className="space-y-4">
      <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 dark:bg-slate-950">
        <strong className="block">
          {es ? "Cuenta pieza por pieza" : "Count every unit"}
        </strong>
        {es
          ? "Ejemplo: llegaron 5 colchas y cada una costó $650. Captura cantidad 5 y costo unitario 650; no pongas el total $3,250 como costo."
          : "Example: 5 units at $650 each means quantity 5 and unit cost 650."}
      </div>
      {control.lineas.map((linea, indice) => {
        const cantidad = Number(linea.cantidad || 0);
        const existencia = linea.producto?.existencia ?? 0;
        return (
          <div
            key={linea.id}
            className="rounded-xl border p-4"
            data-capacitacion="compras.compra.articulo"
          >
            <div className="mb-3 flex justify-between">
              <strong>
                {es ? `Artículo ${indice + 1}` : `Item ${indice + 1}`}
              </strong>
              {control.lineas.length > 1 && (
                <button
                  type="button"
                  onClick={() => control.eliminarLinea(linea.id)}
                  aria-label={es ? "Eliminar artículo" : "Remove item"}
                  data-capacitacion="compras.compra.articulo-eliminar"
                >
                  <X size={18} />
                </button>
              )}
            </div>
            <div data-capacitacion="compras.compra.producto">
              <SelectorProductoRemoto
                valor={linea.producto}
                prefijoCapacitacion="compras.compra.producto"
                alCambiar={(producto) =>
                  control.cambiarLinea(linea.id, {
                    producto,
                    costo: producto?.precioCompra ?? linea.costo,
                    itemPedidoId: "",
                  })
                }
                es={es}
              />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label>
                <span className="etiqueta">
                  {es ? "Piezas recibidas" : "Units received"}
                </span>
                <input
                  className="campo"
                  type="number"
                  min="1"
                  step="1"
                  value={linea.cantidad}
                  onChange={(evento) =>
                    control.cambiarLinea(linea.id, {
                      cantidad: evento.target.value,
                    })
                  }
                  required
                  data-capacitacion="compras.compra.cantidad"
                />
              </label>
              <label>
                <span className="etiqueta">
                  {es ? "Costo por pieza" : "Cost per unit"}
                </span>
                <input
                  className="campo"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={linea.costo}
                  onChange={(evento) =>
                    control.cambiarLinea(linea.id, {
                      costo: evento.target.value,
                    })
                  }
                  required
                  data-capacitacion="compras.compra.costo"
                />
              </label>
              <label>
                <span className="etiqueta">
                  {es ? "¿Surtió un pedido?" : "Related order"}
                </span>
                <select
                  className="campo"
                  value={linea.itemPedidoId}
                  onChange={(evento) =>
                    control.cambiarLinea(linea.id, {
                      itemPedidoId: evento.target.value,
                    })
                  }
                  data-capacitacion="compras.compra.pedido-relacionado"
                >
                  <option value="">
                    {es ? "No, entrada general" : "General receipt"}
                  </option>
                  {pedidos.flatMap((pedido) =>
                    pedido.items
                      .filter(
                        (item) => item.producto?.id === linea.producto?.id,
                      )
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          Sí · {pedido.folio}
                        </option>
                      )),
                  )}
                </select>
              </label>
            </div>
            {linea.producto && (
              <p className="mt-3 rounded-lg bg-blue-50 p-3 text-xs font-semibold text-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
                {es ? "Existencia al confirmar" : "Stock after confirmation"}:{" "}
                {existencia} → {existencia + Math.max(0, cantidad)}
              </p>
            )}
          </div>
        );
      })}
      {control.productosRepetidos && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          {es
            ? "El mismo producto aparece dos veces. Agrupa todo en una sola cantidad."
            : "The same product appears twice. Combine it into one quantity."}
        </p>
      )}
      <button
        type="button"
        className="boton-secundario"
        onClick={control.agregarLinea}
        data-capacitacion="compras.compra.articulo-agregar"
      >
        <Plus size={16} /> {es ? "Agregar otro producto" : "Add product"}
      </button>
    </section>
  );
}
