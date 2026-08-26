import { useState } from "react";
import { Search, UserPlus } from "lucide-react";

import { api } from "@/lib/api";
import type { ClienteJornadaWeb } from "./tipos";

export function BuscadorExtraordinarioWeb({
  rutaId,
  es,
  alSeleccionar,
}: {
  rutaId: string;
  es: boolean;
  alSeleccionar: (cliente: ClienteJornadaWeb) => void;
}) {
  const [termino, establecerTermino] = useState("");
  const [resultados, establecerResultados] = useState<ClienteJornadaWeb[]>([]);
  const [buscando, establecerBuscando] = useState(false);

  async function buscar() {
    if (!rutaId || termino.trim().length < 3) return;
    establecerBuscando(true);
    try {
      const respuesta = await api<{ datos: ClienteJornadaWeb[] }>(
        `/rutas/${rutaId}/clientes-extraordinarios?buscar=${encodeURIComponent(termino.trim())}`,
      );
      establecerResultados(respuesta.datos);
    } finally {
      establecerBuscando(false);
    }
  }

  return (
    <div
      className="mb-4 rounded-xl border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-900 dark:bg-blue-950/30"
      data-capacitacion="rutas.extraordinaria.buscador"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-slate-400" size={18} />
          <input
            className="campo bg-white pl-10 dark:bg-slate-950"
            value={termino}
            minLength={3}
            onChange={(evento) => establecerTermino(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === "Enter") {
                evento.preventDefault();
                void buscar();
              }
            }}
            placeholder={
              es
                ? "Fuera de ruta: nombre, teléfono, dirección o tarjeta"
                : "Outside route: name, phone, address, or card"
            }
            data-capacitacion="rutas.extraordinaria.termino"
          />
        </div>
        <button
          className="boton-secundario"
          onClick={() => void buscar()}
          disabled={buscando || termino.trim().length < 3}
          data-capacitacion="rutas.extraordinaria.buscar"
        >
          {buscando
            ? es
              ? "Buscando…"
              : "Searching…"
            : es
              ? "Buscar clienta"
              : "Find customer"}
        </button>
      </div>
      {resultados.length > 0 && (
        <div
          className="mt-3 grid gap-2 sm:grid-cols-2"
          data-capacitacion="rutas.extraordinaria.resultados"
        >
          {resultados.map((cliente) => (
            <button
              key={cliente.id}
              onClick={() => {
                alSeleccionar({ ...cliente, fueraDeRuta: true });
                establecerResultados([]);
              }}
              className="flex min-h-14 items-center gap-3 rounded-lg border bg-white p-3 text-left dark:bg-slate-950"
              data-capacitacion="rutas.extraordinaria.seleccionar"
            >
              <UserPlus size={18} className="text-blue-600" />
              <span className="flex-1">
                <strong className="block text-sm">
                  {cliente.nombreCompleto}
                </strong>
                <span className="text-xs text-slate-500">
                  {cliente.numeroTarjeta ?? (es ? "Sin tarjeta" : "No card")} ·{" "}
                  {cliente.localidad?.nombre}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
