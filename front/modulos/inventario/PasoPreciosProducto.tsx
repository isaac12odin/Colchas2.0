import type { ControlFormularioProducto } from "./usarFormularioProducto";

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export function PasoPreciosProducto({
  control,
  es,
}: {
  control: ControlFormularioProducto;
  es: boolean;
}) {
  return (
    <section className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2 rounded-xl bg-slate-50 p-4 text-sm leading-6 dark:bg-slate-950">
        <strong className="block">
          {es ? "Después define costo y precio" : "Now set cost and price"}
        </strong>
        {es
          ? "Microejemplo: si compras en $650 y vendes en $1,200, la utilidad por pieza es $550. El precio de venta no puede ser menor al costo."
          : "Example: cost $650 and sale $1,200 means $550 gross profit per unit."}
      </div>
      <label>
        <span className="etiqueta">
          {es ? "Costo de compra por pieza" : "Purchase cost per unit"}
        </span>
        <input
          className="campo"
          type="number"
          min="0"
          step="0.01"
          value={control.valores.precioCompra}
          onChange={(evento) =>
            control.cambiar("precioCompra", evento.target.value)
          }
          required
          data-capacitacion="inventario.producto.precio-compra"
        />
      </label>
      <label>
        <span className="etiqueta">
          {es ? "Precio autorizado de venta" : "Authorized sale price"}
        </span>
        <input
          className="campo"
          type="number"
          min="0.01"
          step="0.01"
          value={control.valores.precioVenta}
          onChange={(evento) =>
            control.cambiar("precioVenta", evento.target.value)
          }
          required
          data-capacitacion="inventario.producto.precio-venta"
        />
      </label>
      <div
        className={`sm:col-span-2 rounded-xl border p-4 ${
          control.preciosValidos
            ? "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100"
            : "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
        }`}
      >
        {control.preciosValidos ? (
          <p>
            {es ? "Utilidad bruta por pieza" : "Gross profit per unit"}:{" "}
            <strong>{dinero.format(control.utilidad)}</strong> ·{" "}
            {control.margen.toFixed(1)}%
          </p>
        ) : (
          <p>
            {es
              ? "Corrige los precios: la venta debe ser mayor o igual al costo."
              : "Fix prices: sale price must be at least the purchase cost."}
          </p>
        )}
      </div>
    </section>
  );
}
