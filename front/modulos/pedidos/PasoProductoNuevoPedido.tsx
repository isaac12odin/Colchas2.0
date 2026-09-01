import { Minus, PackagePlus, Plus, Trash2 } from "lucide-react";

import { SelectorProductoRemoto } from "@/componentes/SelectoresRemotos";
import type { ControlNuevoPedido } from "./usarFormularioNuevoPedido";

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export function PasoProductoNuevoPedido({
  control,
  es,
  puedeCrearProducto,
}: {
  control: ControlNuevoPedido;
  es: boolean;
  puedeCrearProducto: boolean;
}) {
  const aviso =
    control.aviso === "PRODUCTO_INCREMENTADO"
      ? es
        ? "Ese producto ya estaba en el pedido; aumentamos una pieza."
        : "That product was already included; its quantity was increased."
      : control.aviso === "PRODUCTO_AGREGADO"
        ? es
          ? "Producto agregado. Puedes buscar otro o ajustar la cantidad."
          : "Product added. You can add another or adjust the quantity."
        : control.aviso === "PRODUCTO_ELIMINADO"
          ? es
            ? "Producto retirado del pedido."
            : "Product removed from the order."
          : "";

  return (
    <section className="space-y-4">
      <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 dark:bg-slate-950">
        <strong className="block">
          {es ? "Agrega uno o varios productos" : "Add one or more products"}
        </strong>
        {es
          ? "Busca el producto registrado y selecciónalo. Si lo eliges otra vez, aumentaremos su cantidad sin duplicarlo."
          : "Find and select a registered product. Selecting it again increases its quantity without duplicating it."}
      </div>

      <div data-capacitacion="pedidos.nuevo.producto">
        <SelectorProductoRemoto
          valor={control.producto}
          alCambiar={control.seleccionarProducto}
          es={es}
          prefijoCapacitacion="pedidos.producto"
        />
        {puedeCrearProducto ? (
          <button
            type="button"
            className="boton-secundario mt-3"
            onClick={() => control.establecerCreandoProducto(true)}
            data-capacitacion="pedidos.nuevo.producto-crear"
          >
            <PackagePlus size={17} />
            {es ? "No existe: registrar producto" : "Missing: create product"}
          </button>
        ) : (
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {es
              ? "Si no aparece, Administración o Almacén debe registrarlo primero."
              : "Administration or Warehouse must create missing products."}
          </p>
        )}
      </div>

      <p
        className="min-h-5 text-sm font-semibold text-blue-700 dark:text-blue-300"
        aria-live="polite"
      >
        {aviso}
      </p>

      <div className="space-y-3" data-testid="lineas-nuevo-pedido">
        {control.lineas.map((linea, indice) => {
          const cantidadCorrecta =
            Number.isInteger(Number(linea.cantidad)) &&
            Number(linea.cantidad) > 0;
          const subtotal =
            Number(linea.producto.precioVenta) *
            (cantidadCorrecta ? Number(linea.cantidad) : 0);
          return (
            <article
              key={linea.producto.id}
              className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800 sm:p-4"
              data-testid={`linea-pedido-${linea.producto.id}`}
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <strong className="block break-words text-sm">
                    {linea.producto.nombre}
                  </strong>
                  <span className="mt-1 block break-all text-xs text-slate-500">
                    SKU {linea.producto.sku} ·{" "}
                    {dinero.format(Number(linea.producto.precioVenta))}
                  </span>
                </div>
                <button
                  type="button"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
                  onClick={() => control.eliminarProducto(linea.producto.id)}
                  aria-label={`${es ? "Quitar" : "Remove"} ${linea.producto.nombre}`}
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="mt-3 grid gap-3 min-[390px]:grid-cols-[minmax(0,1fr)_auto] min-[390px]:items-end">
                <label>
                  <span className="etiqueta">
                    {es ? "Cantidad" : "Quantity"}
                  </span>
                  <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] overflow-hidden rounded-xl border border-slate-300 dark:border-slate-700">
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center justify-center bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800"
                      onClick={() =>
                        control.cambiarCantidad(linea.producto.id, -1)
                      }
                      aria-label={`${es ? "Disminuir cantidad de" : "Decrease quantity of"} ${linea.producto.nombre}`}
                    >
                      <Minus size={17} />
                    </button>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      inputMode="numeric"
                      value={linea.cantidad}
                      onChange={(evento) =>
                        control.establecerCantidad(
                          linea.producto.id,
                          evento.target.value,
                        )
                      }
                      className="min-h-11 min-w-0 border-x border-slate-300 bg-white px-2 text-center font-bold outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
                      required
                      aria-invalid={!cantidadCorrecta}
                      aria-label={`${es ? "Cantidad de" : "Quantity of"} ${linea.producto.nombre}`}
                      data-capacitacion={
                        indice === 0
                          ? "pedidos.nuevo.cantidad"
                          : "pedidos.nuevo.cantidad-adicional"
                      }
                    />
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center justify-center bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800"
                      onClick={() =>
                        control.cambiarCantidad(linea.producto.id, 1)
                      }
                      aria-label={`${es ? "Aumentar cantidad de" : "Increase quantity of"} ${linea.producto.nombre}`}
                    >
                      <Plus size={17} />
                    </button>
                  </div>
                  {!cantidadCorrecta && (
                    <small className="mt-1 block text-red-700 dark:text-red-300">
                      {es
                        ? "Escribe una cantidad entera mayor a cero."
                        : "Enter a whole number greater than zero."}
                    </small>
                  )}
                </label>
                <p
                  className="rounded-xl bg-blue-50 px-3 py-2 text-right text-sm text-blue-950 dark:bg-blue-950/40 dark:text-blue-100"
                  data-capacitacion={
                    indice === 0 ? "pedidos.nuevo.precio-revisar" : undefined
                  }
                >
                  <span className="block text-xs">Subtotal</span>
                  <strong>{dinero.format(subtotal)}</strong>
                </p>
              </div>
            </article>
          );
        })}
        {!control.lineas.length && (
          <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500 dark:border-slate-700">
            <PackagePlus className="mx-auto mb-2" size={24} />
            {es
              ? "Todavía no agregas productos. Selecciona uno arriba para continuar."
              : "No products added yet. Select one above to continue."}
          </div>
        )}
      </div>

      {control.lineas.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-950 p-4 text-white">
          <span className="text-sm">
            {es
              ? `${control.lineas.length} producto${control.lineas.length === 1 ? "" : "s"}`
              : `${control.lineas.length} product${control.lineas.length === 1 ? "" : "s"}`}
          </span>
          <strong className="text-lg">
            Total: {dinero.format(control.total)}
          </strong>
        </div>
      )}
    </section>
  );
}
