import { Search, X } from "lucide-react";
import type { FormEvent } from "react";

import {
  estadosPedido,
  etiquetaEstadoPedido,
  etiquetaEstadoPedidoEn,
} from "./tipos";

export function FiltrosPedidos({
  estado,
  buscar,
  es,
  alCambiar,
  alBuscar,
  alAplicarBusqueda,
  alLimpiarBusqueda,
}: {
  estado: string;
  buscar: string;
  es: boolean;
  alCambiar: (estado: string) => void;
  alBuscar: (buscar: string) => void;
  alAplicarBusqueda: () => void;
  alLimpiarBusqueda: () => void;
}) {
  function buscarPedidos(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    alAplicarBusqueda();
  }

  return (
    <section
      className="panel mb-4 space-y-3 p-4"
      data-capacitacion="pedidos.filtros"
    >
      <form
        className="flex flex-col gap-2 sm:flex-row"
        role="search"
        onSubmit={buscarPedidos}
      >
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">
            {es ? "Buscar pedidos" : "Search orders"}
          </span>
          <Search
            className="pointer-events-none absolute left-3 top-3 text-slate-400"
            size={18}
          />
          <input
            className="campo pl-10 pr-10"
            value={buscar}
            onChange={(evento) => alBuscar(evento.target.value)}
            placeholder={
              es
                ? "Folio, cliente, tarjeta o producto"
                : "Reference, customer, card, or product"
            }
            data-capacitacion="pedidos.busqueda.campo"
          />
          {buscar && (
            <button
              type="button"
              onClick={alLimpiarBusqueda}
              className="absolute right-2 top-2 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label={es ? "Limpiar búsqueda" : "Clear search"}
            >
              <X size={17} />
            </button>
          )}
        </label>
        <button
          type="submit"
          className="boton-primario justify-center"
          data-capacitacion="pedidos.busqueda.ejecutar"
        >
          <Search size={17} />
          {es ? "Buscar" : "Search"}
        </button>
      </form>
      <div
        className="flex gap-2 overflow-x-auto pb-1"
        aria-label={es ? "Filtrar por estado" : "Filter by status"}
      >
        {estadosPedido.map((opcion) => (
          <button
            type="button"
            key={opcion}
            onClick={() => alCambiar(opcion)}
            className={`${estado === opcion ? "boton-primario" : "boton-secundario"} whitespace-nowrap`}
            aria-pressed={estado === opcion}
            data-capacitacion={`pedidos.filtro.${opcion || "TODOS"}`}
          >
            {opcion
              ? es
                ? etiquetaEstadoPedido[opcion]
                : etiquetaEstadoPedidoEn[opcion]
              : es
                ? "Todos"
                : "All"}
          </button>
        ))}
      </div>
    </section>
  );
}
