import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  GripVertical,
  MapPinned,
  TriangleAlert,
  UsersRound,
  X,
} from "lucide-react";
import { useState } from "react";

import { moverEnOrden, ordenarSugerido } from "./dominio";
import type { ClienteRuta } from "./tipos";

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export function OrdenClientesRuta({
  es,
  orden,
  clientes,
  cambiar,
}: {
  es: boolean;
  orden: string[];
  clientes: ReadonlyMap<string, ClienteRuta>;
  cambiar: (orden: string[]) => void;
}) {
  const [arrastrando, establecerArrastrando] = useState<number | null>(null);

  function mover(origen: number, destino: number) {
    cambiar(moverEnOrden(orden, origen, destino));
  }

  return (
    <fieldset
      className="rounded-2xl border p-4"
      data-capacitacion="rutas.configuracion.orden"
    >
      <legend className="px-2 text-sm font-black text-blue-700 dark:text-blue-300">
        {es
          ? "4. Decide quién va primero y quién después"
          : "4. Set the exact visit order"}
      </legend>
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="boton-secundario"
          disabled={orden.length < 2}
          onClick={() => cambiar(ordenarSugerido(orden, clientes, "VENCIDOS"))}
        >
          <TriangleAlert size={16} />{" "}
          {es ? "Vencidos primero" : "Overdue first"}
        </button>
        <button
          type="button"
          className="boton-secundario"
          disabled={orden.length < 2}
          onClick={() => cambiar(ordenarSugerido(orden, clientes, "LOCALIDAD"))}
        >
          <MapPinned size={16} />{" "}
          {es ? "Agrupar por localidad" : "Group by location"}
        </button>
      </div>
      <div className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
        {orden.map((clienteId, indice) => {
          const cliente = clientes.get(clienteId);
          if (!cliente) return null;
          return (
            <article
              key={clienteId}
              draggable
              onDragStart={() => establecerArrastrando(indice)}
              onDragOver={(evento) => evento.preventDefault()}
              onDrop={() => {
                if (arrastrando !== null) mover(arrastrando, indice);
                establecerArrastrando(null);
              }}
              className="grid grid-cols-[36px_24px_1fr_auto] items-center gap-2 rounded-xl border bg-white p-2 shadow-sm dark:bg-slate-900"
              data-capacitacion="rutas.configuracion.orden-fila"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-600 text-xs font-black text-white">
                {indice + 1}
              </span>
              <GripVertical size={18} className="cursor-grab text-slate-400" />
              <span className="min-w-0">
                <strong className="block truncate text-sm">
                  {cliente.nombreCompleto}
                </strong>
                <span className="block truncate text-xs text-slate-500">
                  {cliente.localidad.nombre} · {es ? "Cobrar" : "Collect"}{" "}
                  {dinero.format(cliente.estadoCuenta.cobrarHoy)}
                </span>
              </span>
              <span className="flex flex-wrap justify-end gap-1">
                <ControlOrden
                  etiqueta={
                    es
                      ? `Enviar a ${cliente.nombreCompleto} al inicio`
                      : `Move ${cliente.nombreCompleto} first`
                  }
                  deshabilitado={indice === 0}
                  alPulsar={() => mover(indice, 0)}
                >
                  <ArrowUpToLine size={15} />
                </ControlOrden>
                <ControlOrden
                  etiqueta={
                    es
                      ? `Subir a ${cliente.nombreCompleto}`
                      : `Move ${cliente.nombreCompleto} up`
                  }
                  deshabilitado={indice === 0}
                  alPulsar={() => mover(indice, indice - 1)}
                  capacitacion={
                    indice === 1 ? "rutas.configuracion.orden-subir" : undefined
                  }
                >
                  <ArrowUp size={15} />
                </ControlOrden>
                <ControlOrden
                  etiqueta={
                    es
                      ? `Bajar a ${cliente.nombreCompleto}`
                      : `Move ${cliente.nombreCompleto} down`
                  }
                  deshabilitado={indice === orden.length - 1}
                  alPulsar={() => mover(indice, indice + 1)}
                  capacitacion="rutas.configuracion.orden-bajar"
                >
                  <ArrowDown size={15} />
                </ControlOrden>
                <ControlOrden
                  etiqueta={
                    es
                      ? `Enviar a ${cliente.nombreCompleto} al final`
                      : `Move ${cliente.nombreCompleto} last`
                  }
                  deshabilitado={indice === orden.length - 1}
                  alPulsar={() => mover(indice, orden.length - 1)}
                >
                  <ArrowDownToLine size={15} />
                </ControlOrden>
                <ControlOrden
                  etiqueta={es ? "Quitar de la ruta" : "Remove from route"}
                  alPulsar={() =>
                    cambiar(orden.filter((id) => id !== clienteId))
                  }
                >
                  <X size={15} />
                </ControlOrden>
              </span>
            </article>
          );
        })}
        {!orden.length && (
          <div className="flex items-center justify-center gap-2 p-6 text-sm text-slate-500">
            <UsersRound size={18} />
            {es
              ? "Selecciona clientes para construir el recorrido."
              : "Select customers to build the route."}
          </div>
        )}
      </div>
      <p
        className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300"
        data-capacitacion="rutas.configuracion.orden-revisar"
      >
        {orden.length}{" "}
        {es
          ? "cliente(s) en el orden exacto que tendrá la hoja de ruta y el PDF."
          : "customer(s) in the exact route and PDF order."}
      </p>
    </fieldset>
  );
}

function ControlOrden({
  etiqueta,
  deshabilitado = false,
  alPulsar,
  capacitacion,
  children,
}: {
  etiqueta: string;
  deshabilitado?: boolean;
  alPulsar: () => void;
  capacitacion?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="rounded-lg border p-2 disabled:opacity-30"
      disabled={deshabilitado}
      onClick={alPulsar}
      aria-label={etiqueta}
      title={etiqueta}
      data-capacitacion={capacitacion}
    >
      {children}
    </button>
  );
}
