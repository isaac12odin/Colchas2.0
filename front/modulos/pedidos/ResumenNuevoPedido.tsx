import type { ControlNuevoPedido } from "./usarFormularioNuevoPedido";

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export function ResumenNuevoPedido({
  control,
  es,
}: {
  control: ControlNuevoPedido;
  es: boolean;
}) {
  const total =
    Number(control.producto?.precioVenta ?? 0) * Number(control.cantidad || 0);
  return (
    <section className="space-y-4" data-capacitacion="pedidos.nuevo.revision">
      <div className="rounded-xl bg-slate-950 p-5 text-white">
        <p className="text-xs font-bold uppercase tracking-wider text-blue-300">
          {es ? "Revisa la solicitud" : "Review request"}
        </p>
        <h3 className="mt-2 text-xl font-black">
          {control.cliente?.nombreCompleto}
        </h3>
        <p className="mt-3">
          <strong>
            {control.cantidad} × {control.producto?.nombre}
          </strong>
          <span className="block text-sm text-slate-300">
            SKU {control.producto?.sku}
          </span>
        </p>
        <p className="mt-4 border-t border-slate-700 pt-4 text-lg font-black">
          {es ? "Estimado" : "Estimate"}: {dinero.format(total)}
        </p>
      </div>
      <label>
        <span className="etiqueta">
          {es
            ? "Fecha prometida al cliente (opcional)"
            : "Customer promise date (optional)"}
        </span>
        <input
          type="date"
          className="campo"
          value={control.fechaCompromiso}
          onChange={(evento) =>
            control.establecerFechaCompromiso(evento.target.value)
          }
          data-capacitacion="pedidos.nuevo.fecha-compromiso"
        />
      </label>
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
        <strong className="block">
          {es ? "Al crear el pedido" : "When created"}
        </strong>
        {es
          ? "Quedará Pendiente de pedir para asignar proveedor. No descuenta inventario, no crea venta, no cobra dinero y no aumenta el saldo del cliente."
          : "It remains pending supplier. It does not change stock, sales, cash, or customer balance."}
      </div>
    </section>
  );
}
