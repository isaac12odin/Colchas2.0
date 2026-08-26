import type { ProductoInventario } from "./tipos";
import type { ControlFormularioProducto } from "./usarFormularioProducto";

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export function PasoExistenciaProducto({
  control,
  producto,
  categoriaNombre,
  es,
}: {
  control: ControlFormularioProducto;
  producto?: ProductoInventario | null;
  categoriaNombre: string;
  es: boolean;
}) {
  return (
    <section className="grid gap-4 sm:grid-cols-2">
      {!producto && (
        <label>
          <span className="etiqueta">
            {es ? "Piezas contadas físicamente" : "Physically counted units"}
          </span>
          <input
            className="campo"
            type="number"
            min="0"
            step="1"
            value={control.valores.existenciaInicial}
            onChange={(evento) =>
              control.cambiar("existenciaInicial", evento.target.value)
            }
            required
            data-capacitacion="inventario.producto.existencia-inicial"
          />
          <small className="mt-1 block text-slate-500">
            {es
              ? "Escribe 0 si todavía no ha llegado mercancía."
              : "Enter 0 if no stock has arrived yet."}
          </small>
        </label>
      )}
      <label>
        <span className="etiqueta">
          {es ? "Avisar cuando queden" : "Warn when stock reaches"}
        </span>
        <input
          className="campo"
          type="number"
          min="0"
          step="1"
          value={control.valores.existenciaMinima}
          onChange={(evento) =>
            control.cambiar("existenciaMinima", evento.target.value)
          }
          required
          data-capacitacion="inventario.producto.existencia-minima"
        />
      </label>
      <div
        className="sm:col-span-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100"
        data-capacitacion="inventario.producto.revision"
      >
        <strong className="block text-base">
          {es ? "Esto se guardará" : "This will be saved"}
        </strong>
        <p>
          {control.valores.nombre || (es ? "Producto sin nombre" : "Unnamed")}
          {categoriaNombre ? ` · ${categoriaNombre}` : ""}
          {control.valores.marca ? ` · ${control.valores.marca}` : ""}
        </p>
        <p>
          SKU {control.valores.sku || "—"} ·{" "}
          {dinero.format(Number(control.valores.precioCompra || 0))} →{" "}
          {dinero.format(Number(control.valores.precioVenta || 0))}
        </p>
        <p className="mt-2 font-semibold">
          {producto
            ? es
              ? `La existencia seguirá en ${producto.existencia}; cámbiala con Ajustar o registra una compra.`
              : `Stock remains ${producto.existencia}; use Adjust or record a purchase.`
            : es
              ? `Se crearán ${control.valores.existenciaInicial || "0"} piezas de existencia inicial.`
              : `${control.valores.existenciaInicial || "0"} initial units will be created.`}
        </p>
      </div>
    </section>
  );
}
