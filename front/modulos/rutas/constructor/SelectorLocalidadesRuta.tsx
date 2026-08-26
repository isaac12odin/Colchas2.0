import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import type { ClienteRuta, LocalidadRuta } from "./tipos";

export function SelectorLocalidadesRuta({
  es,
  localidades,
  clientes,
  seleccionadas,
  alternar,
}: {
  es: boolean;
  localidades: LocalidadRuta[];
  clientes: ClienteRuta[];
  seleccionadas: string[];
  alternar: (id: string) => void;
}) {
  const [buscar, establecerBuscar] = useState("");
  const conteos = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const cliente of clientes)
      mapa.set(cliente.localidadId, (mapa.get(cliente.localidadId) ?? 0) + 1);
    return mapa;
  }, [clientes]);
  const termino = buscar.trim().toLocaleLowerCase("es-MX");

  return (
    <fieldset
      className="rounded-2xl border p-4"
      data-capacitacion="rutas.configuracion.localidades"
    >
      <legend className="px-2 text-sm font-black text-blue-700 dark:text-blue-300">
        {es ? "2. Elige los lugares" : "2. Choose locations"}
      </legend>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-3 text-slate-400" size={17} />
        <input
          className="campo pl-9"
          value={buscar}
          onChange={(evento) => establecerBuscar(evento.target.value)}
          placeholder={
            es ? "Buscar localidad o estado" : "Search location or state"
          }
          data-capacitacion="rutas.configuracion.localidad-buscar"
        />
      </div>
      <div className="grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
        {localidades
          .filter((localidad) =>
            `${localidad.nombre} ${localidad.estado}`
              .toLocaleLowerCase("es-MX")
              .includes(termino),
          )
          .map((localidad) => {
            const activa = seleccionadas.includes(localidad.id);
            return (
              <label
                key={localidad.id}
                className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-3 ${activa ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" : "hover:border-slate-400"}`}
              >
                <input
                  type="checkbox"
                  checked={activa}
                  onChange={() => alternar(localidad.id)}
                  data-capacitacion="rutas.configuracion.localidad-seleccionar"
                />
                <span className="min-w-0 flex-1">
                  <strong className="block truncate">{localidad.nombre}</strong>
                  <span className="text-xs text-slate-500">
                    {localidad.estado}
                  </span>
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold dark:bg-slate-800">
                  {conteos.get(localidad.id) ?? 0}
                </span>
              </label>
            );
          })}
      </div>
    </fieldset>
  );
}
