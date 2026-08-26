"use client";

import { Check, Search } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";

export interface OpcionBuscable {
  id: string;
  titulo: string;
  detalle?: string;
  busqueda: string;
  imagenUrl?: string | null;
}

function normalizar(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-MX");
}

/** Selector compacto para evitar listas enormes y elecciones ambiguas. */
export function SelectorBuscable({
  nombre,
  etiqueta,
  placeholder,
  opciones,
  valor,
  alCambiar,
  alBuscar,
  sinResultados,
  prefijoCapacitacion,
}: {
  nombre: string;
  etiqueta: string;
  placeholder: string;
  opciones: OpcionBuscable[];
  valor: string;
  alCambiar: (id: string) => void;
  alBuscar?: (texto: string) => void;
  sinResultados: string;
  prefijoCapacitacion?: string;
}) {
  const [texto, establecerTexto] = useState("");
  const seleccionada = opciones.find((opcion) => opcion.id === valor);
  const visibles = useMemo(() => {
    const termino = normalizar(texto.trim());
    return opciones
      .filter(
        (opcion) => !termino || normalizar(opcion.busqueda).includes(termino),
      )
      .slice(0, 8);
  }, [opciones, texto]);

  return (
    <div
      data-capacitacion={
        prefijoCapacitacion ? `${prefijoCapacitacion}.selector` : undefined
      }
    >
      <span className="etiqueta">{etiqueta}</span>
      <input type="hidden" name={nombre} value={valor} />
      {seleccionada && (
        <div
          className="mb-2 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950/40"
          data-capacitacion={
            prefijoCapacitacion ? `${prefijoCapacitacion}.seleccion` : undefined
          }
        >
          {seleccionada.imagenUrl ? (
            <Image
              unoptimized
              src={seleccionada.imagenUrl}
              alt=""
              width={44}
              height={44}
              className="h-11 w-11 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <Check className="mt-0.5 shrink-0 text-blue-600" size={17} />
          )}
          <span className="min-w-0 flex-1">
            <strong className="block truncate">{seleccionada.titulo}</strong>
            {seleccionada.detalle && (
              <small className="block truncate text-slate-500">
                {seleccionada.detalle}
              </small>
            )}
          </span>
          <button
            type="button"
            className="text-xs font-semibold text-blue-700"
            onClick={() => alCambiar("")}
            data-capacitacion={
              prefijoCapacitacion ? `${prefijoCapacitacion}.cambiar` : undefined
            }
          >
            Cambiar
          </button>
        </div>
      )}
      {!seleccionada && (
        <>
          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-3 text-slate-400"
            />
            <input
              className="campo pl-10"
              value={texto}
              onChange={(evento) => {
                establecerTexto(evento.target.value);
                alBuscar?.(evento.target.value);
              }}
              placeholder={placeholder}
              autoComplete="off"
              data-capacitacion={
                prefijoCapacitacion
                  ? `${prefijoCapacitacion}.buscar`
                  : undefined
              }
            />
          </div>
          <div
            className="mt-2 max-h-52 space-y-1 overflow-y-auto rounded-lg border p-1"
            data-capacitacion={
              prefijoCapacitacion
                ? `${prefijoCapacitacion}.opciones`
                : undefined
            }
          >
            {visibles.map((opcion) => (
              <button
                type="button"
                key={opcion.id}
                className="block min-h-11 w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => {
                  alCambiar(opcion.id);
                  establecerTexto("");
                }}
                data-capacitacion={
                  prefijoCapacitacion
                    ? `${prefijoCapacitacion}.opcion`
                    : undefined
                }
              >
                <span className="flex items-center gap-3">
                  {opcion.imagenUrl && (
                    <Image
                      unoptimized
                      src={opcion.imagenUrl}
                      alt=""
                      width={42}
                      height={42}
                      className="h-10 w-10 shrink-0 rounded-lg object-cover"
                    />
                  )}
                  <span className="min-w-0">
                    <strong className="block truncate">{opcion.titulo}</strong>
                    {opcion.detalle && (
                      <small className="block truncate text-slate-500">
                        {opcion.detalle}
                      </small>
                    )}
                  </span>
                </span>
              </button>
            ))}
            {!visibles.length && (
              <p className="p-3 text-center text-xs text-slate-500">
                {sinResultados}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
