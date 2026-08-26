import { CheckCircle2, Plus } from "lucide-react";

import type { ResultadoVentaWeb } from "../tipos";
import { dineroVenta } from "./utilidades";

export function ConfirmacionVenta({
  es,
  resultado,
  alCerrar,
  alNuevaVenta,
}: {
  es: boolean;
  resultado: ResultadoVentaWeb;
  alCerrar: () => void;
  alNuevaVenta: () => void;
}) {
  const saldo = resultado.resumenSaldo;
  return (
    <div className="py-5 text-center" data-capacitacion="ventas.resultado">
      <CheckCircle2 className="mx-auto text-emerald-500" size={58} />
      <h3 className="mt-4 text-2xl font-black">
        {es ? "Venta registrada" : "Sale recorded"}
      </h3>
      <p className="mt-1 text-sm text-slate-500">
        {es ? "Folio" : "Reference"} {resultado.folio}
      </p>
      {saldo && (
        <div
          className="mx-auto mt-6 max-w-md rounded-2xl border border-blue-200 bg-blue-50 p-5 text-left dark:border-blue-900 dark:bg-blue-950/40"
          data-capacitacion="ventas.resultado.saldo"
        >
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
            {es
              ? "Saldo actualizado correctamente"
              : "Balance updated successfully"}
          </p>
          <div className="mt-4 flex items-end justify-between gap-4">
            <SaldoConfirmado
              etiqueta={es ? "Antes" : "Before"}
              valor={saldo.saldoAnterior}
            />
            <SaldoConfirmado
              etiqueta={es ? "Ahora debe" : "Now owed"}
              valor={saldo.saldoNuevo}
              actual
            />
          </div>
          <p className="mt-4 border-t border-blue-200 pt-3 text-xs text-slate-600 dark:border-blue-900 dark:text-slate-300">
            {es ? "Venta" : "Sale"} {dineroVenta.format(saldo.cargoVenta)} −{" "}
            {es ? "anticipo" : "deposit"} {dineroVenta.format(saldo.anticipo)}.
          </p>
        </div>
      )}
      <div className="mt-7 flex flex-col-reverse justify-center gap-2 sm:flex-row">
        <button
          type="button"
          className="boton-secundario"
          onClick={alCerrar}
          data-capacitacion="ventas.resultado.cerrar"
        >
          {es ? "Cerrar" : "Close"}
        </button>
        <button
          type="button"
          className="boton-primario"
          onClick={alNuevaVenta}
          data-capacitacion="ventas.resultado.otra"
        >
          <Plus size={17} /> {es ? "Registrar otra" : "Record another"}
        </button>
      </div>
    </div>
  );
}

function SaldoConfirmado({
  etiqueta,
  valor,
  actual = false,
}: {
  etiqueta: string;
  valor: number;
  actual?: boolean;
}) {
  return (
    <span className={`${actual ? "text-right" : ""} text-sm text-slate-500`}>
      {etiqueta}
      <strong
        className={`block ${actual ? "text-2xl text-blue-700 dark:text-blue-300" : "text-base text-slate-700 dark:text-slate-200"}`}
      >
        {dineroVenta.format(valor)}
      </strong>
    </span>
  );
}
