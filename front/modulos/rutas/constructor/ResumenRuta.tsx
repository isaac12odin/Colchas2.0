import {
  Banknote,
  CircleDollarSign,
  TriangleAlert,
  UsersRound,
} from "lucide-react";

import { totalesRuta } from "./dominio";
import type { ClienteRuta } from "./tipos";

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export function ResumenRuta({
  es,
  orden,
  clientes,
}: {
  es: boolean;
  orden: string[];
  clientes: ReadonlyMap<string, ClienteRuta>;
}) {
  const totales = totalesRuta(orden, clientes);
  return (
    <section
      className="rounded-2xl border bg-slate-950 p-4 text-white"
      data-capacitacion="rutas.configuracion.resumen"
    >
      <h3 className="font-semibold">
        {es ? "Resumen antes de guardar" : "Review before saving"}
      </h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Dato
          icono={<UsersRound />}
          etiqueta={es ? "Visitas" : "Visits"}
          valor={String(orden.length)}
        />
        <Dato
          icono={<CircleDollarSign />}
          etiqueta={es ? "Saldo total" : "Total balance"}
          valor={dinero.format(totales.saldo)}
        />
        <Dato
          icono={<TriangleAlert />}
          etiqueta={es ? "Vencido" : "Overdue"}
          valor={dinero.format(totales.vencido)}
        />
        <Dato
          icono={<Banknote />}
          etiqueta={es ? "Cobrar hoy" : "Collect today"}
          valor={dinero.format(totales.cobrarHoy)}
        />
      </div>
    </section>
  );
}

function Dato({
  icono,
  etiqueta,
  valor,
}: {
  icono: React.ReactNode;
  etiqueta: string;
  valor: string;
}) {
  return (
    <div className="rounded-xl bg-white/10 p-3">
      <span className="text-blue-200">{icono}</span>
      <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-slate-300">
        {etiqueta}
      </p>
      <strong className="text-lg">{valor}</strong>
    </div>
  );
}
