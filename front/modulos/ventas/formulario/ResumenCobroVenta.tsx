import { dineroVenta } from "./utilidades";

export function ResumenCobroVenta({
  es,
  esCredito,
  subtotal,
  piezas,
  descuento,
  total,
  saldoAnterior,
  anticipo,
  financiado,
}: {
  es: boolean;
  esCredito: boolean;
  subtotal: number;
  piezas: number;
  descuento: number;
  total: number;
  saldoAnterior: number;
  anticipo: number;
  financiado: number;
}) {
  return (
    <aside
      className="h-fit rounded-2xl bg-slate-950 p-5 text-white"
      data-capacitacion="ventas.cobro.resumen"
    >
      <p className="text-xs font-bold uppercase tracking-wider text-blue-300">
        {es ? "Resumen antes de confirmar" : "Review before confirming"}
      </p>
      <dl className="mt-5 space-y-3 text-sm">
        <Fila
          etiqueta={es ? "Productos" : "Products"}
          valor={dineroVenta.format(subtotal)}
        />
        {descuento > 0 && (
          <Fila
            etiqueta={es ? "Descuento" : "Discount"}
            valor={`− ${dineroVenta.format(descuento)}`}
          />
        )}
        <Fila
          etiqueta={es ? "Total de la venta" : "Sale total"}
          valor={dineroVenta.format(total)}
          fuerte
        />
        {esCredito && (
          <>
            <Fila
              etiqueta={es ? "Saldo actual" : "Current balance"}
              valor={dineroVenta.format(saldoAnterior)}
            />
            <Fila
              etiqueta={es ? "Anticipo" : "Deposit"}
              valor={`− ${dineroVenta.format(anticipo)}`}
            />
            <div
              className="mt-4 rounded-xl bg-blue-600 p-4"
              data-capacitacion="ventas.cobro.saldo-resultante"
            >
              <dt className="text-xs text-blue-100">
                {es ? "Saldo después de vender" : "Balance after sale"}
              </dt>
              <dd className="mt-1 text-2xl font-black">
                {dineroVenta.format(saldoAnterior + financiado)}
              </dd>
              <p className="mt-1 text-xs text-blue-100">
                {es
                  ? "Se actualizará al confirmar."
                  : "It updates when confirmed."}
              </p>
            </div>
          </>
        )}
      </dl>
      <div className="mt-5 rounded-xl border border-slate-700 p-4 text-xs leading-5 text-slate-200">
        <strong className="block text-white">
          {es ? "Al confirmar" : "On confirmation"}
        </strong>
        {esCredito
          ? `Se descontarán ${piezas} pieza${piezas === 1 ? "" : "s"} del inventario, se creará la venta y se sumarán ${dineroVenta.format(financiado)} al saldo del cliente. El anticipo se registra como dinero recibido, no como otra deuda.`
          : `Se descontarán ${piezas} pieza${piezas === 1 ? "" : "s"} del inventario y se creará una venta pagada. No aumentará el saldo del cliente.`}
      </div>
    </aside>
  );
}

function Fila({
  etiqueta,
  valor,
  fuerte = false,
}: {
  etiqueta: string;
  valor: string;
  fuerte?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-4 ${fuerte ? "border-y border-slate-700 py-3 text-base" : ""}`}
    >
      <dt className="text-slate-300">{etiqueta}</dt>
      <dd className="font-bold">{valor}</dd>
    </div>
  );
}
