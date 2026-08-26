import type { PedidoWeb } from "./tipos";
import type { ControlEntregaPedido } from "./usarFormularioEntregaPedido";

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export function ResumenEntregaPedido({
  pedido,
  control,
  total,
  es,
}: {
  pedido: PedidoWeb;
  control: ControlEntregaPedido;
  total: number;
  es: boolean;
}) {
  return (
    <section className="space-y-4" data-capacitacion="pedidos.entrega.revision">
      <div className="rounded-xl bg-slate-950 p-5 text-white">
        <p className="text-xs font-bold uppercase tracking-wider text-blue-300">
          {es ? "Revisión final" : "Final review"}
        </p>
        <h3 className="mt-2 text-xl font-black">
          {pedido.cliente.nombreCompleto}
        </h3>
        <div className="mt-4 space-y-2 text-sm">
          {pedido.items.map((item) => (
            <div key={item.id} className="flex justify-between gap-3">
              <span>
                {item.cantidad} × {item.descripcion}
              </span>
              <strong>
                {dinero.format(Number(item.precioEstimado) * item.cantidad)}
              </strong>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2 border-t border-slate-700 pt-4 text-sm">
          <p className="flex justify-between">
            <span>{es ? "Total" : "Total"}</span>
            <strong>{dinero.format(total)}</strong>
          </p>
          <p className="flex justify-between">
            <span>{es ? "Recibido hoy" : "Received"}</span>
            <strong>{dinero.format(Number(control.anticipo || 0))}</strong>
          </p>
          <p className="flex justify-between">
            <span>{es ? "Se agregará al saldo" : "Added to balance"}</span>
            <strong>{dinero.format(control.financiado)}</strong>
          </p>
        </div>
      </div>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
        <strong className="block">
          {es
            ? "Esta acción sí afecta el negocio"
            : "This action changes business records"}
        </strong>
        {es
          ? "Se marcará el pedido como Entregado, se creará una venta, se descontarán las piezas del inventario y se registrará el dinero recibido. En crédito, el monto financiado se sumará al saldo del cliente y se creará su plan de pago."
          : "The order is delivered, a sale is created, stock is reduced, and payment or balance is recorded."}
      </div>
    </section>
  );
}
