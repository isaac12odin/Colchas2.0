"use client";

import { ChevronLeft, ChevronRight, LocateFixed } from "lucide-react";

import type { FasePaso } from "./dominioEntrenador";

export function ControlesEntrenador({
  es,
  fase,
  esUltimo,
  pasoActual,
  totalPasos,
  flotante = false,
  alMostrarObjetivo,
  alAnterior,
  alContinuar,
}: {
  es: boolean;
  fase: FasePaso;
  esUltimo: boolean;
  pasoActual: number;
  totalPasos: number;
  flotante?: boolean;
  alMostrarObjetivo: () => void;
  alAnterior: () => void;
  alContinuar: () => void;
}) {
  const mensaje =
    fase === "EJEMPLO"
      ? es
        ? "Lee el ejemplo y ubica el control."
        : "Read the example and locate the control."
      : fase === "ACTUAR"
        ? es
          ? "Completa el control marcado en azul."
          : "Complete the control outlined in blue."
        : es
          ? "Acción comprobada. Ya puedes avanzar."
          : "Action verified. You can continue.";

  return (
    <div
      className="border-t border-slate-200 bg-white/95 p-3 shadow-[0_-8px_20px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95"
      data-capacitacion-entrenador
      data-testid={
        flotante ? "controles-practica-flotantes" : "controles-practica-fijos"
      }
      role="group"
      aria-label={es ? "Controles de la práctica" : "Practice controls"}
    >
      <div className="mx-auto max-w-xl">
        <div className="mb-2 flex items-center justify-between gap-3 text-[11px] font-bold">
          <span className="text-slate-600 dark:text-slate-300">{mensaje}</span>
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {pasoActual + 1}/{totalPasos}
          </span>
        </div>
        {fase === "EJEMPLO" ? (
          <div className="flex gap-2">
            <button
              type="button"
              className="boton-secundario px-3"
              onClick={alAnterior}
              disabled={pasoActual === 0}
              aria-label={es ? "Paso anterior" : "Previous step"}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              className="boton-primario flex-1 justify-center"
              onClick={alMostrarObjetivo}
              data-testid={
                flotante
                  ? "mostrar-objetivo-practica-flotante"
                  : "mostrar-objetivo-practica"
              }
            >
              <LocateFixed size={18} />
              {es ? "Entendido, mostrarme dónde" : "Got it, show me where"}
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              className="boton-secundario px-3"
              onClick={alAnterior}
              disabled={pasoActual === 0}
              aria-label={es ? "Paso anterior" : "Previous step"}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              className="boton-primario flex-1 justify-center"
              disabled={fase !== "COMPLETADO"}
              onClick={alContinuar}
              data-testid={
                flotante
                  ? "continuar-practica-flotante"
                  : "continuar-practica-real"
              }
            >
              {esUltimo
                ? es
                  ? "Terminar práctica"
                  : "Finish practice"
                : es
                  ? "Siguiente micropaso"
                  : "Next micro step"}
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
