import {
  Banknote,
  CalendarClock,
  CircleDollarSign,
  TriangleAlert,
} from "lucide-react";

import type { ClienteJornadaWeb } from "./tipos";

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export function ResumenCobroRuta({
  cliente,
  es,
}: {
  cliente: ClienteJornadaWeb;
  es: boolean;
}) {
  const datos = [
    [
      es ? "Debes cobrar hoy" : "Collect today",
      cliente.estadoCuenta.cobrarHoy,
      Banknote,
    ],
    [
      es ? "Saldo total" : "Total balance",
      cliente.estadoCuenta.saldoTotal,
      CircleDollarSign,
    ],
    [es ? "Vencido" : "Overdue", cliente.estadoCuenta.vencido, TriangleAlert],
    [
      es ? "Abono acordado" : "Agreed payment",
      cliente.estadoCuenta.abonoPeriodico,
      CalendarClock,
    ],
  ] as const;

  return (
    <div
      className="grid gap-3 sm:grid-cols-2"
      data-capacitacion="rutas.visita.resumen"
    >
      {datos.map(([etiqueta, valor, Icono], indice) => (
        <div
          key={etiqueta}
          className={
            indice === 0
              ? "rounded-xl bg-blue-700 p-4 text-white"
              : "rounded-xl bg-slate-50 p-4 dark:bg-slate-900"
          }
        >
          <Icono size={18} />
          <span className="mt-2 block text-xs opacity-70">{etiqueta}</span>
          <strong className="text-xl">{dinero.format(valor)}</strong>
        </div>
      ))}
    </div>
  );
}
