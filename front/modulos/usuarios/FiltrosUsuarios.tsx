import { Search, X } from "lucide-react";
import type { FormEvent } from "react";

const roles = [
  "ADMINISTRADOR",
  "CONTABLE",
  "VENDEDOR",
  "ALMACENISTA",
  "COBRADOR",
] as const;

export function FiltrosUsuarios({
  buscar,
  rol,
  activo,
  es,
  alBuscar,
  alAplicarBusqueda,
  alLimpiarBusqueda,
  alCambiarRol,
  alCambiarActivo,
}: {
  buscar: string;
  rol: string;
  activo: string;
  es: boolean;
  alBuscar: (valor: string) => void;
  alAplicarBusqueda: () => void;
  alLimpiarBusqueda: () => void;
  alCambiarRol: (valor: string) => void;
  alCambiarActivo: (valor: string) => void;
}) {
  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    alAplicarBusqueda();
  }

  return (
    <form
      className="panel mb-4 grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_12rem_11rem_auto]"
      role="search"
      onSubmit={enviar}
      data-capacitacion="usuarios.filtros"
    >
      <label className="relative min-w-0">
        <span className="sr-only">
          {es ? "Buscar usuarios" : "Search users"}
        </span>
        <Search
          className="pointer-events-none absolute left-3 top-3 text-slate-400"
          size={18}
        />
        <input
          className="campo pl-10 pr-10"
          value={buscar}
          onChange={(evento) => alBuscar(evento.target.value)}
          placeholder={es ? "Nombre o correo" : "Name or email"}
          data-capacitacion="usuarios.busqueda.campo"
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
      <label>
        <span className="sr-only">
          {es ? "Filtrar por rol" : "Filter by role"}
        </span>
        <select
          className="campo"
          value={rol}
          onChange={(evento) => alCambiarRol(evento.target.value)}
          aria-label={es ? "Filtrar por rol" : "Filter by role"}
        >
          <option value="">{es ? "Todos los roles" : "All roles"}</option>
          {roles.map((opcion) => (
            <option key={opcion} value={opcion}>
              {opcion}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="sr-only">
          {es ? "Filtrar por estado" : "Filter by status"}
        </span>
        <select
          className="campo"
          value={activo}
          onChange={(evento) => alCambiarActivo(evento.target.value)}
          aria-label={es ? "Filtrar por estado" : "Filter by status"}
        >
          <option value="">{es ? "Todos los estados" : "All statuses"}</option>
          <option value="true">{es ? "Activos" : "Active"}</option>
          <option value="false">{es ? "Inactivos" : "Inactive"}</option>
        </select>
      </label>
      <button
        type="submit"
        className="boton-primario justify-center"
        data-capacitacion="usuarios.busqueda.ejecutar"
      >
        <Search size={17} />
        {es ? "Buscar" : "Search"}
      </button>
    </form>
  );
}
