"use client";

import { CheckCircle2 } from "lucide-react";

export interface ResultadoDevolucion {
  id: string;
  folio: string;
  tipo: string;
  totalDevuelto: string;
  aplicadoSaldo: string;
  montoReembolsado: string;
}

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export function ResultadoDevolucionRegistrada({
  resultado,
  folioVenta,
  es,
  cerrar,
}: {
  resultado: ResultadoDevolucion;
  folioVenta?: string;
  es: boolean;
  cerrar: () => void;
}) {
  return (
    <div className="space-y-5" aria-live="polite">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
        <CheckCircle2 className="mb-3" size={34} aria-hidden="true" />
        <p className="font-semibold">
          {es
            ? "Inventario, saldo y reembolso quedaron registrados."
            : "Inventory, balance, and refund were recorded."}
        </p>
        <p className="mt-3 text-xs uppercase tracking-wide opacity-75">
          {es ? "Folio de devolución" : "Return reference"}
        </p>
        <p
          className="mt-1 break-all font-mono text-xl font-bold"
          data-testid="folio-devolucion-confirmada"
        >
          {resultado.folio}
        </p>
        <p className="mt-3 text-sm">
          {es ? "Venta relacionada:" : "Related sale:"}{" "}
          <strong>{folioVenta}</strong>
        </p>
        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          <span>
            {es ? "Devuelto" : "Returned"}{" "}
            <strong>{dinero.format(Number(resultado.totalDevuelto))}</strong>
          </span>
          <span>
            {es ? "Saldo" : "Balance"}{" "}
            <strong>{dinero.format(Number(resultado.aplicadoSaldo))}</strong>
          </span>
          <span>
            {es ? "Reembolso" : "Refund"}{" "}
            <strong>{dinero.format(Number(resultado.montoReembolsado))}</strong>
          </span>
        </div>
      </div>
      <div className="flex justify-end">
        <button type="button" className="boton-primario" onClick={cerrar}>
          {es ? "Listo" : "Done"}
        </button>
      </div>
    </div>
  );
}
