"use client";

import type { FormEvent } from "react";

import { usarAplicacion } from "@/componentes/proveedores";
import { Modal } from "@/componentes/ui";

interface LocalidadAltaCliente {
  id: string;
  nombre: string;
  estado: string;
}

interface PropiedadesModalAltaCliente {
  abierto: boolean;
  cerrar: () => void;
  localidades: LocalidadAltaCliente[];
  localidadSeleccionada: string;
  seleccionarLocalidad: (id: string) => void;
  busquedaLocalidad: string;
  cambiarBusquedaLocalidad: (valor: string) => void;
  abrirAltaLocalidad: () => void;
  guardar: (evento: FormEvent<HTMLFormElement>) => void;
}

/** Alta operativa; las decisiones financieras se muestran sólo a quien toca. */
export function ModalAltaCliente({
  abierto,
  cerrar,
  localidades,
  localidadSeleccionada,
  seleccionarLocalidad,
  busquedaLocalidad,
  cambiarBusquedaLocalidad,
  abrirAltaLocalidad,
  guardar,
}: PropiedadesModalAltaCliente) {
  const { t, idioma, usuario } = usarAplicacion();
  const es = idioma === "es";
  const puedeCrearLocalidad = usuario?.rol === "ADMINISTRADOR";
  const puedeDefinirLimite =
    usuario?.rol === "ADMINISTRADOR" || usuario?.rol === "CONTABLE";
  const filtro = busquedaLocalidad.toLocaleLowerCase("es-MX");

  return (
    <Modal
      abierto={abierto}
      cerrar={cerrar}
      titulo={es ? "Nuevo cliente" : "New customer"}
    >
      <form
        onSubmit={guardar}
        className="grid gap-4 sm:grid-cols-2"
        data-capacitacion="clientes.alta.formulario"
      >
        <label className="sm:col-span-2">
          <span className="etiqueta">
            {es ? "Nombre completo" : "Full name"}
          </span>
          <input
            name="nombreCompleto"
            className="campo"
            data-capacitacion="clientes.alta.nombre"
            required
            minLength={3}
          />
        </label>
        <label>
          <span className="etiqueta">{es ? "Teléfono" : "Phone"}</span>
          <input
            name="telefono"
            className="campo"
            required
            inputMode="tel"
            data-capacitacion="clientes.alta.telefono"
          />
        </label>
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="etiqueta mb-0">
              {es ? "Localidad" : "Location"}
            </span>
            {puedeCrearLocalidad && (
              <button
                type="button"
                className="text-xs font-semibold text-blue-600 hover:underline"
                onClick={abrirAltaLocalidad}
                data-capacitacion="clientes.alta.localidad-crear"
              >
                {es ? "+ Crear localidad" : "+ Create location"}
              </button>
            )}
          </div>
          <input
            className="campo mb-2"
            data-capacitacion="clientes.alta.localidad-buscar"
            value={busquedaLocalidad}
            onChange={(evento) => cambiarBusquedaLocalidad(evento.target.value)}
            placeholder={
              es
                ? "Filtrar localidad por nombre o estado"
                : "Filter location by name or state"
            }
          />
          <select
            name="localidadId"
            className="campo"
            data-capacitacion="clientes.alta.localidad"
            required
            value={localidadSeleccionada}
            onChange={(evento) => seleccionarLocalidad(evento.target.value)}
          >
            <option value="" data-capacitacion="clientes.alta.localidad.opcion">
              {localidades.length
                ? "—"
                : es
                  ? "Primero crea una localidad"
                  : "Create a location first"}
            </option>
            {localidades
              .filter((localidad) =>
                `${localidad.nombre} ${localidad.estado}`
                  .toLocaleLowerCase("es-MX")
                  .includes(filtro),
              )
              .map((localidad) => (
                <option
                  key={localidad.id}
                  value={localidad.id}
                  data-capacitacion="clientes.alta.localidad.opcion"
                >
                  {localidad.nombre}, {localidad.estado}
                </option>
              ))}
          </select>
        </div>
        <label className="sm:col-span-2">
          <span className="etiqueta">{es ? "Dirección" : "Address"}</span>
          <textarea
            name="direccion"
            className="campo min-h-24 py-3"
            data-capacitacion="clientes.alta.direccion"
            required
          />
        </label>
        {puedeDefinirLimite && (
          <label>
            <span className="etiqueta">
              {es
                ? "Límite de crédito (0 = sin límite)"
                : "Credit limit (0 = unlimited)"}
            </span>
            <input
              name="limiteCredito"
              className="campo"
              data-capacitacion="clientes.alta.limite-credito"
              type="number"
              min="0"
              step="0.01"
              defaultValue="0"
            />
          </label>
        )}
        <div
          className="sm:col-span-2 flex justify-end gap-2 pt-2"
          data-capacitacion="clientes.alta.revision"
        >
          <button
            type="button"
            className="boton-secundario"
            onClick={cerrar}
            data-capacitacion="clientes.alta.cancelar"
          >
            {t.cancelar}
          </button>
          <button
            className="boton-primario disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!localidadSeleccionada}
            data-capacitacion="clientes.alta.guardar"
          >
            {t.guardar}
          </button>
        </div>
      </form>
    </Modal>
  );
}
