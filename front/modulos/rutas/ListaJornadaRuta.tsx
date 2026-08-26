import { CheckCircle2, MapPin } from "lucide-react";

import { EstadoVacio } from "@/componentes/ui";
import type { ClienteJornadaWeb, JornadaWeb } from "./tipos";

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export function ListaJornadaRuta({
  jornada,
  es,
  seleccionar,
}: {
  jornada: JornadaWeb | null;
  es: boolean;
  seleccionar: (cliente: ClienteJornadaWeb) => void;
}) {
  return (
    <section
      className="panel overflow-hidden"
      data-capacitacion="rutas.jornada.listado"
    >
      <header
        className="border-b p-4"
        data-capacitacion="rutas.jornada.resumen"
      >
        <h2 className="font-semibold">
          {jornada?.nombre ?? (es ? "Selecciona una ruta" : "Select a route")}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          {jornada
            ? `${jornada.clientes.filter((cliente) => cliente.visita).length}/${jornada.clientes.length} ${es ? "visitas registradas" : "visits recorded"}`
            : ""}
        </p>
      </header>
      <div className="divide-y">
        {jornada?.clientes.map((cliente) => (
          <FilaCliente
            key={cliente.id}
            cliente={cliente}
            es={es}
            seleccionar={seleccionar}
          />
        ))}
        {jornada?.clientes.length === 0 && (
          <EstadoVacio
            texto={
              es
                ? "La ruta no tiene clientes asignados."
                : "This route has no assigned customers."
            }
          />
        )}
      </div>
    </section>
  );
}

function FilaCliente({
  cliente,
  es,
  seleccionar,
}: {
  cliente: ClienteJornadaWeb;
  es: boolean;
  seleccionar: (cliente: ClienteJornadaWeb) => void;
}) {
  return (
    <button
      onClick={() => seleccionar(cliente)}
      className="grid w-full gap-3 p-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800 sm:grid-cols-[45px_1fr_auto] sm:items-center"
      data-capacitacion="rutas.jornada.cliente"
    >
      <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-sm font-semibold dark:bg-slate-800">
        {cliente.orden}
      </span>
      <span>
        <span className="flex items-center gap-2 font-semibold">
          {cliente.nombreCompleto}
          {cliente.fueraDeRuta && (
            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
              {es ? "FUERA DE RUTA" : "EXTRA"}
            </span>
          )}
          {cliente.visita && (
            <CheckCircle2 size={16} className="text-emerald-600" />
          )}
        </span>
        <span className="mt-1 block text-xs text-slate-500">
          <MapPin size={12} className="mr-1 inline" />
          {cliente.direccion} · {cliente.telefono}
        </span>
        {cliente.estadoCuenta.diasRetardoActual > 0 && (
          <span className="mt-1 block text-xs font-bold text-red-600">
            {cliente.estadoCuenta.diasRetardoActual}{" "}
            {es ? "días de retardo" : "days late"}
          </span>
        )}
      </span>
      <span className="text-left sm:text-right">
        <span className="block text-[10px] font-bold uppercase text-slate-500">
          {es ? "Cobrar hoy" : "Collect today"}
        </span>
        <strong className="block text-lg text-blue-700 dark:text-blue-300">
          {dinero.format(cliente.estadoCuenta.cobrarHoy)}
        </strong>
        <span className="text-xs text-slate-500">
          {cliente.visita?.resultado ??
            `${es ? "Saldo" : "Balance"} ${dinero.format(cliente.estadoCuenta.saldoTotal)}`}
        </span>
      </span>
    </button>
  );
}
