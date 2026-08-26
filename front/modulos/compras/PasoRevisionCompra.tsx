import type { PedidoPendienteCompra, ProveedorCompra } from "./tipos";
import type { ControlFormularioCompra } from "./usarFormularioCompra";

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export function PasoRevisionCompra({
  control,
  proveedores,
  pedidos,
  es,
}: {
  control: ControlFormularioCompra;
  proveedores: ProveedorCompra[];
  pedidos: PedidoPendienteCompra[];
  es: boolean;
}) {
  const proveedor = proveedores.find(
    (actual) => actual.id === control.proveedorId,
  );
  const folioPedido = (itemId: string) =>
    pedidos.find((pedido) => pedido.items.some((item) => item.id === itemId))
      ?.folio;
  return (
    <section className="space-y-4" data-capacitacion="compras.compra.revision">
      <div className="rounded-xl bg-slate-950 p-5 text-white">
        <p className="text-xs font-bold uppercase tracking-wider text-blue-300">
          {es
            ? "Revisa antes de mover inventario"
            : "Review before changing stock"}
        </p>
        <p className="mt-3 text-lg font-black">
          {proveedor?.nombre ?? "—"} ·{" "}
          {new Date(`${control.fechaCompra}T12:00:00`).toLocaleDateString(
            "es-MX",
          )}
        </p>
        <div className="mt-4 space-y-3">
          {control.lineas.map((linea) => (
            <div key={linea.id} className="rounded-lg bg-slate-900 p-3 text-sm">
              <div className="flex justify-between gap-3">
                <strong>
                  {linea.cantidad} × {linea.producto?.nombre}
                </strong>
                <strong>
                  {dinero.format(Number(linea.cantidad) * Number(linea.costo))}
                </strong>
              </div>
              <p className="mt-1 text-xs text-slate-300">
                {dinero.format(Number(linea.costo))}{" "}
                {es ? "por pieza" : "per unit"}
                {linea.itemPedidoId
                  ? ` · ${folioPedido(linea.itemPedidoId)}`
                  : ""}
              </p>
            </div>
          ))}
        </div>
        <p
          className="mt-4 border-t border-slate-700 pt-4 text-xl font-black"
          data-capacitacion="compras.compra.total-revisar"
        >
          {es ? "Total de compra" : "Purchase total"}:{" "}
          {dinero.format(control.total)}
        </p>
      </div>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
        <strong className="block">
          {es ? "Al confirmar" : "On confirmation"}
        </strong>
        {es
          ? "Se creará una compra, se sumarán las piezas a Inventario y el costo registrado de cada producto se actualizará. No se crea una venta ni deuda de cliente. Si vinculaste un pedido, aún debes confirmar su recepción física en Pedidos."
          : "A purchase and stock movements are created. No sale or customer balance is created."}
      </div>
      <label>
        <span className="etiqueta">
          {es ? "Notas o folio de factura (opcional)" : "Notes (optional)"}
        </span>
        <textarea
          className="campo min-h-20 py-3"
          value={control.notas}
          onChange={(evento) => control.establecerNotas(evento.target.value)}
          data-capacitacion="compras.compra.notas"
        />
      </label>
    </section>
  );
}
