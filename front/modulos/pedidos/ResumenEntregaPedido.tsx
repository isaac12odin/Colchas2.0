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
          <p className="flex justify-between gap-3">
            <span>{es ? "Tipo de venta" : "Sale type"}</span>
            <strong>
              {control.tipo === "CONTADO"
                ? es
                  ? "Contado"
                  : "Cash"
                : es
                  ? "Crédito"
                  : "Credit"}
            </strong>
          </p>
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
          {control.tipo === "CREDITO" && (
            <p className="pt-2 text-xs text-slate-300">
              {es ? "Plan" : "Plan"}: {control.periodicidad.toLowerCase()} ·{" "}
              {dinero.format(Number(control.montoCuota || 0))} ·{" "}
              {es ? "primer vencimiento" : "first due"}{" "}
              {new Date(
                `${control.primerVencimiento}T12:00:00`,
              ).toLocaleDateString(es ? "es-MX" : "en-US")}
            </p>
          )}
        </div>
      </div>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
        <strong className="block">
          {es
            ? "Esta acción sí afecta el negocio"
            : "This action changes business records"}
        </strong>
        {control.tipo === "CONTADO"
          ? es
            ? `Se marcará Entregado, se creará la venta, se descontará inventario y se registrarán ${dinero.format(total)} como cobro completo. El saldo del cliente no aumentará.`
            : "The order is delivered, stock is reduced, full payment is recorded, and no balance is created."
          : es
            ? `Se marcará Entregado, se creará la venta y se descontará inventario. Hoy entran ${dinero.format(Number(control.anticipo || 0))}; ${dinero.format(control.financiado)} se sumarán al saldo y generarán el plan de pagos.`
            : "The order is delivered, stock is reduced, the deposit is recorded, and the financed amount becomes customer balance."}
      </div>
    </section>
  );
}
