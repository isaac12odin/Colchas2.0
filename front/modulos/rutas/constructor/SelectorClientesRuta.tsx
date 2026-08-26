import { Check, Search } from "lucide-react";
import { useMemo, useState } from "react";

import type { ClienteRuta } from "./tipos";

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export function SelectorClientesRuta({
  es,
  clientes,
  localidades,
  seleccionados,
  alternar,
}: {
  es: boolean;
  clientes: ClienteRuta[];
  localidades: string[];
  seleccionados: string[];
  alternar: (id: string) => void;
}) {
  const [buscar, establecerBuscar] = useState("");
  const elegibles = useMemo(() => {
    const termino = buscar.trim().toLocaleLowerCase("es-MX");
    return clientes.filter(
      (cliente) =>
        Number(cliente.saldo?.saldoActual ?? 0) > 0 &&
        localidades.includes(cliente.localidadId) &&
        (!termino ||
          `${cliente.nombreCompleto} ${cliente.numeroTarjeta ?? ""} ${cliente.localidad.nombre} ${cliente.localidad.estado}`
            .toLocaleLowerCase("es-MX")
            .includes(termino)),
    );
  }, [buscar, clientes, localidades]);

  return (
    <fieldset
      className="rounded-2xl border p-4"
      data-capacitacion="rutas.configuracion.clientes"
    >
      <legend className="px-2 text-sm font-black text-blue-700 dark:text-blue-300">
        {es ? "3. Selecciona a quién cobrar" : "3. Select customers to collect"}
      </legend>
      <p className="mb-3 text-xs leading-5 text-slate-500">
        {es
          ? "Cobrar hoy es diferente del saldo total: muestra sólo vencido más lo que toca en la fecha."
          : "Collect today is separate from total balance: it includes only overdue and today's due amount."}
      </p>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-3 text-slate-400" size={17} />
        <input
          className="campo pl-9"
          value={buscar}
          onChange={(evento) => establecerBuscar(evento.target.value)}
          placeholder={
            es
              ? "Buscar por nombre, tarjeta o localidad"
              : "Search by name, card, or location"
          }
          disabled={!localidades.length}
          data-capacitacion="rutas.configuracion.cliente-buscar"
        />
      </div>
      <div className="grid max-h-[28rem] gap-3 overflow-y-auto lg:grid-cols-2">
        {elegibles.map((cliente) => {
          const seleccionada = seleccionados.includes(cliente.id);
          return (
            <button
              type="button"
              key={cliente.id}
              onClick={() => alternar(cliente.id)}
              className={`grid grid-cols-[28px_1fr] gap-3 rounded-xl border p-3 text-left transition ${seleccionada ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" : "hover:border-slate-400"}`}
              aria-pressed={seleccionada}
              data-capacitacion={
                seleccionados.length === 0
                  ? "rutas.configuracion.cliente-seleccionar"
                  : !seleccionada
                    ? "rutas.configuracion.cliente-seleccionar-segunda"
                    : undefined
              }
            >
              <span
                className={`grid h-6 w-6 place-items-center rounded-md border ${seleccionada ? "border-blue-600 bg-blue-600 text-white" : "text-transparent"}`}
              >
                <Check size={15} />
              </span>
              <span className="min-w-0">
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <strong className="block truncate text-sm">
                      {cliente.nombreCompleto}
                    </strong>
                    <span className="text-xs text-slate-500">
                      {cliente.localidad.nombre} ·{" "}
                      {cliente.numeroTarjeta ??
                        (es ? "Sin tarjeta" : "No card")}
                    </span>
                  </span>
                  <strong className="shrink-0 text-blue-700 dark:text-blue-300">
                    {dinero.format(cliente.estadoCuenta.cobrarHoy)}
                  </strong>
                </span>
                <span className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-slate-500">
                  <span>
                    {es ? "Saldo" : "Balance"}
                    <strong className="block text-slate-800 dark:text-white">
                      {dinero.format(cliente.estadoCuenta.saldoTotal)}
                    </strong>
                  </span>
                  <span>
                    {es ? "Vencido" : "Overdue"}
                    <strong
                      className={
                        cliente.estadoCuenta.vencido > 0
                          ? "block text-red-600"
                          : "block"
                      }
                    >
                      {dinero.format(cliente.estadoCuenta.vencido)}
                    </strong>
                  </span>
                  <span>
                    {es ? "Retardo" : "Delay"}
                    <strong className="block">
                      {cliente.estadoCuenta.diasRetardoActual} d
                    </strong>
                  </span>
                </span>
              </span>
            </button>
          );
        })}
        {!localidades.length && (
          <p className="p-6 text-center text-sm text-slate-500 lg:col-span-2">
            {es ? "Primero selecciona los lugares." : "Choose locations first."}
          </p>
        )}
        {localidades.length > 0 && !elegibles.length && (
          <p className="p-6 text-center text-sm text-slate-500 lg:col-span-2">
            {es
              ? "No hay clientes con saldo en esta selección."
              : "No customers with a balance match this selection."}
          </p>
        )}
      </div>
    </fieldset>
  );
}
