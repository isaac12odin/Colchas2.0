import { MapPinned, UserRoundSearch } from "lucide-react";
import { useEffect, useState } from "react";

import { BuscadorExtraordinarioWeb } from "./BuscadorExtraordinarioWeb";
import { ListaJornadaRuta } from "./ListaJornadaRuta";
import type { ClienteJornadaWeb, JornadaWeb } from "./tipos";

type OrigenCliente = "RUTA" | "FUERA_RUTA";

export function SelectorOrigenCobranzaRuta({
  rutaId,
  jornada,
  es,
  seleccionar,
}: {
  rutaId: string;
  jornada: JornadaWeb | null;
  es: boolean;
  seleccionar: (cliente: ClienteJornadaWeb) => void;
}) {
  const [origen, establecerOrigen] = useState<OrigenCliente>("RUTA");

  useEffect(() => establecerOrigen("RUTA"), [rutaId]);

  return (
    <section data-capacitacion="rutas.jornada.origen-cliente">
      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        <BotonOrigen
          activo={origen === "RUTA"}
          icono={MapPinned}
          titulo={es ? "Clientas de esta ruta" : "Customers on this route"}
          detalle={
            es
              ? `${jornada?.clientes.filter((cliente) => !cliente.fueraDeRuta).length ?? 0} programadas, en el orden definido`
              : `${jornada?.clientes.filter((cliente) => !cliente.fueraDeRuta).length ?? 0} scheduled in route order`
          }
          alElegir={() => establecerOrigen("RUTA")}
        />
        <BotonOrigen
          activo={origen === "FUERA_RUTA"}
          icono={UserRoundSearch}
          titulo={es ? "Cobro fuera de ruta" : "Outside-route collection"}
          detalle={
            es
              ? "Busca una clienta no programada y conserva la excepción"
              : "Find an unscheduled customer and preserve the exception"
          }
          alElegir={() => establecerOrigen("FUERA_RUTA")}
        />
      </div>

      {origen === "RUTA" ? (
        <ListaJornadaRuta jornada={jornada} es={es} seleccionar={seleccionar} />
      ) : (
        <div className="panel p-4">
          <h2 className="font-semibold">
            {es ? "Localiza a la clienta" : "Find the customer"}
          </h2>
          <p className="mb-4 mt-1 text-xs leading-5 text-slate-500">
            {es
              ? "El pago se asociará a esta jornada, pero quedará marcado como fuera de ruta."
              : "The payment will belong to this workday but remain marked as outside the route."}
          </p>
          <BuscadorExtraordinarioWeb
            rutaId={rutaId}
            es={es}
            alSeleccionar={seleccionar}
          />
        </div>
      )}
    </section>
  );
}

function BotonOrigen({
  activo,
  icono: Icono,
  titulo,
  detalle,
  alElegir,
}: {
  activo: boolean;
  icono: typeof MapPinned;
  titulo: string;
  detalle: string;
  alElegir: () => void;
}) {
  return (
    <button
      type="button"
      className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
        activo
          ? "border-blue-600 bg-blue-50 ring-2 ring-blue-200 dark:bg-blue-950/30"
          : "bg-white hover:border-blue-300 dark:bg-slate-950"
      }`}
      onClick={alElegir}
      aria-pressed={activo}
    >
      <Icono className="mt-0.5 shrink-0 text-blue-700" size={21} />
      <span>
        <strong className="block text-sm">{titulo}</strong>
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {detalle}
        </span>
      </span>
    </button>
  );
}
