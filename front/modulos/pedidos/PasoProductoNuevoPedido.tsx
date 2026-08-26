import { PackagePlus } from "lucide-react";

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
  return (
    <section className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2 rounded-xl bg-slate-50 p-4 text-sm leading-6 dark:bg-slate-950">
        <strong className="block">
          {es ? "¿Qué debes conseguir?" : "What needs to be supplied?"}
        </strong>
        {es
          ? "Selecciona el producto exacto por nombre y SKU. Ejemplo: 2 × Colcha matrimonial COL-MAT-01."
          : "Choose the exact product by name and SKU."}
      </div>
      <div className="sm:col-span-2" data-capacitacion="pedidos.nuevo.producto">
        <SelectorProductoRemoto
          valor={control.producto}
          alCambiar={control.establecerProducto}
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
      <label>
        <span className="etiqueta">
          {es ? "Cantidad solicitada" : "Requested quantity"}
        </span>
        <input
          type="number"
          min="1"
          step="1"
          value={control.cantidad}
          onChange={(evento) => control.establecerCantidad(evento.target.value)}
          className="campo"
          required
          data-capacitacion="pedidos.nuevo.cantidad"
        />
      </label>
      {control.producto && (
        <div
          className="rounded-xl bg-blue-50 p-4 text-sm text-blue-950 dark:bg-blue-950/40 dark:text-blue-100"
          data-capacitacion="pedidos.nuevo.precio-revisar"
        >
          {es ? "Precio estimado del pedido" : "Estimated order price"}:{" "}
          <strong>
            {dinero.format(
              Number(control.producto.precioVenta) *
                Number(control.cantidad || 0),
            )}
          </strong>
          <small className="mt-1 block">
            {es
              ? "Se respetará este precio estimado al entregar."
              : "This estimate is used at delivery."}
          </small>
        </div>
      )}
    </section>
  );
}
