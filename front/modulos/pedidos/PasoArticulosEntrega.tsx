import type { PedidoWeb } from "./tipos";
import type { ControlEntregaPedido } from "./usarFormularioEntregaPedido";

export function PasoArticulosEntrega({
  pedido,
  control,
  es,
}: {
  pedido: PedidoWeb;
  control: ControlEntregaPedido;
  es: boolean;
}) {
  return (
    <section
      className="space-y-4"
      data-capacitacion="pedidos.entrega.trazabilidad"
    >
      <div className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
        <strong className="block">
          {es
            ? "Entrega sólo lo que tienes enfrente"
            : "Deliver only verified goods"}
        </strong>
        {es
          ? "Compara cliente, producto, cantidad y proveedor. Marca cada renglón después de ver físicamente el paquete."
          : "Verify customer, product, quantity, and supplier before continuing."}
      </div>
      <div className="rounded-xl border p-4">
        <p className="text-xs text-slate-500">{pedido.folio}</p>
        <strong className="text-lg">{pedido.cliente.nombreCompleto}</strong>
      </div>
      {pedido.items.map((item) => (
        <label
          key={item.id}
          className="flex cursor-pointer items-start gap-3 rounded-xl border p-4"
        >
          <input
            type="checkbox"
            className="mt-1 size-5"
            checked={control.verificados.includes(item.id)}
            onChange={(evento) =>
              control.establecerVerificados((actuales) =>
                evento.target.checked
                  ? [...actuales, item.id]
                  : actuales.filter((id) => id !== item.id),
              )
            }
            data-capacitacion="pedidos.entrega.articulo-verificado"
          />
          <span className="flex-1">
            <strong className="block">
              {item.cantidad} × {item.descripcion}
            </strong>
            <small className="text-slate-500">
              {es ? "Surtió" : "Supplier"}:{" "}
              {item.proveedor?.nombre ?? (es ? "Sin asignar" : "Unassigned")}
            </small>
          </span>
        </label>
      ))}
    </section>
  );
}
