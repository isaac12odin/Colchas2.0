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
  return (
    <section className="space-y-4" data-capacitacion="pedidos.nuevo.revision">
      <div className="rounded-xl bg-slate-950 p-5 text-white">
        <p className="text-xs font-bold uppercase tracking-wider text-blue-300">
          {es ? "Revisa la solicitud" : "Review request"}
        </p>
        <h3 className="mt-2 text-xl font-black">
          {control.cliente?.nombreCompleto}
        </h3>
        <div className="mt-4 space-y-3">
          {control.lineas.map((linea) => (
            <div
              key={linea.producto.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-slate-700 pb-3 last:border-b-0 last:pb-0"
            >
              <p className="min-w-0">
                <strong className="block break-words">
                  {linea.cantidad} × {linea.producto.nombre}
                </strong>
                <span className="block break-all text-sm text-slate-300">
                  SKU {linea.producto.sku}
                </span>
              </p>
              <strong className="text-right text-sm">
                {dinero.format(
                  Number(linea.producto.precioVenta) * Number(linea.cantidad),
                )}
              </strong>
            </div>
          ))}
        </div>
        <p className="mt-4 border-t border-slate-700 pt-4 text-lg font-black">
          {es ? "Total estimado" : "Estimated total"}:{" "}
          {dinero.format(control.total)}
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
          min={control.fechaMinima}
          onChange={(evento) =>
            control.establecerFechaCompromiso(evento.target.value)
          }
          aria-invalid={!control.fechaCompromisoValida}
          data-capacitacion="pedidos.nuevo.fecha-compromiso"
        />
        {!control.fechaCompromisoValida && (
          <small className="mt-1 block text-red-700 dark:text-red-300">
            {es
              ? "La fecha prometida no puede quedar en el pasado."
              : "The promised date cannot be in the past."}
          </small>
        )}
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
