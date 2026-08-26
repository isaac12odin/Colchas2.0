import type { ControlFormularioCompra } from "./usarFormularioCompra";
import type { ProveedorCompra } from "./tipos";

export function PasoProveedorCompra({
  control,
  proveedores,
  es,
}: {
  control: ControlFormularioCompra;
  proveedores: ProveedorCompra[];
  es: boolean;
}) {
  return (
    <section className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2 rounded-xl bg-slate-50 p-4 text-sm leading-6 dark:bg-slate-950">
        <strong className="block">
          {es ? "Usa el documento que recibiste" : "Use the received document"}
        </strong>
        {es
          ? "Selecciona quien surtió y la fecha comprobable de factura, nota o recepción. Todavía no se moverá inventario."
          : "Choose the supplier and the document or receipt date. Stock has not changed yet."}
      </div>
      <label>
        <span className="etiqueta">
          {es ? "Proveedor que surtió" : "Supplier"}
        </span>
        <select
          className="campo"
          value={control.proveedorId}
          onChange={(evento) =>
            control.establecerProveedorId(evento.target.value)
          }
          required
          data-capacitacion="compras.compra.proveedor"
        >
          <option value="">
            {es ? "Selecciona un proveedor" : "Choose supplier"}
          </option>
          {proveedores
            .filter((proveedor) => proveedor.activo)
            .map((proveedor) => (
              <option key={proveedor.id} value={proveedor.id}>
                {proveedor.nombre}
              </option>
            ))}
        </select>
      </label>
      <label>
        <span className="etiqueta">
          {es ? "Fecha comprobable" : "Document date"}
        </span>
        <input
          type="date"
          className="campo"
          value={control.fechaCompra}
          onChange={(evento) =>
            control.establecerFechaCompra(evento.target.value)
          }
          required
          data-capacitacion="compras.compra.fecha"
        />
      </label>
    </section>
  );
}
