"use client";

import { Plus } from "lucide-react";

import { obtenerAccionesWeb } from "@/lib/accionesWeb";
import type { Idioma } from "@/lib/i18n";
import type { Rol } from "@/lib/tipos";

export function AccionesRapidas({
  rol,
  idioma,
  modo = "tarjetas",
}: {
  rol: Rol;
  idioma: Idioma;
  modo?: "tarjetas" | "menu";
}) {
  const acciones = obtenerAccionesWeb(rol, modo === "tarjetas");

  if (modo === "menu") {
    return (
      <details
        className="group relative"
        data-capacitacion="inicio.accion-rapida.menu"
      >
        <summary
          className="boton-primario cursor-pointer list-none select-none px-3 sm:px-4"
          data-capacitacion="inicio.accion-rapida.abrir"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">
            {idioma === "es" ? "Acción rápida" : "Quick action"}
          </span>
        </summary>
        <div
          className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-xl border bg-white p-2 shadow-2xl dark:bg-slate-950"
          data-capacitacion="inicio.accion-rapida.opciones"
        >
          <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            {idioma === "es" ? "¿Qué vas a hacer?" : "What do you need to do?"}
          </p>
          {acciones.map((accion) => {
            const Icono = accion.icono;
            return (
              <a
                key={accion.clave}
                href={accion.href}
                className="flex gap-3 rounded-lg px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-900"
                data-capacitacion={`inicio.accion.${accion.clave}`}
              >
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                  <Icono size={17} />
                </span>
                <span>
                  <strong className="block text-sm">
                    {accion.titulo[idioma]}
                  </strong>
                  <span className="block text-xs leading-5 text-slate-600 dark:text-slate-300">
                    {accion.descripcion[idioma]}
                  </span>
                </span>
              </a>
            );
          })}
        </div>
      </details>
    );
  }

  return (
    <div
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
      data-capacitacion="inicio.acciones-rapidas"
    >
      {acciones.map((accion, indice) => {
        const Icono = accion.icono;
        return (
          <a
            key={accion.clave}
            href={accion.href}
            className={`group rounded-xl border p-4 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:hover:border-blue-700 ${
              indice === 0
                ? "border-blue-200 bg-blue-50/70 dark:border-blue-900 dark:bg-blue-950/30"
                : "bg-white dark:bg-slate-900"
            }`}
            data-capacitacion="inicio.accion-disponible"
            data-capacitacion-accion={accion.clave}
          >
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-600 text-white shadow-sm">
              <Icono size={20} />
            </span>
            <strong className="mt-3 block text-sm">
              {accion.titulo[idioma]}
            </strong>
            <span className="mt-1 block text-xs leading-5 text-slate-600 dark:text-slate-300">
              {accion.descripcion[idioma]}
            </span>
          </a>
        );
      })}
    </div>
  );
}
