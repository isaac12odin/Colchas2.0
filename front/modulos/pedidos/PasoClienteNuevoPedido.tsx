import { SelectorClienteRemoto } from "@/componentes/SelectoresRemotos";
import type { ControlNuevoPedido } from "./usarFormularioNuevoPedido";

export function PasoClienteNuevoPedido({
  control,
  es,
}: {
  control: ControlNuevoPedido;
  es: boolean;
}) {
  return (
    <section className="space-y-4" data-capacitacion="pedidos.nuevo.cliente">
      <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 dark:bg-slate-950">
        <strong className="block">
          {es ? "¿Para quién es el pedido?" : "Who is this order for?"}
        </strong>
        {es
          ? "Busca nombre, teléfono o tarjeta y verifica dirección. Crear un pedido todavía no genera deuda."
          : "Find the customer and verify the address. An order does not create debt yet."}
      </div>
      <SelectorClienteRemoto
        valor={control.cliente}
        alCambiar={control.establecerCliente}
        es={es}
        prefijoCapacitacion="pedidos.cliente"
      />
    </section>
  );
}
