import { Check } from "lucide-react";
import type { ReactNode } from "react";

export interface PasoOperacion {
  titulo: string;
  descripcion: string;
}

export function IndicadorPasosOperacion({
  pasos,
  actual,
}: {
  pasos: PasoOperacion[];
  actual: number;
}) {
  return (
    <ol className="mb-6 grid gap-2 sm:grid-cols-3" aria-label="Progreso">
      {pasos.map((paso, indice) => {
        const numero = indice + 1;
        const completado = numero < actual;
        const activo = numero === actual;
        return (
          <li
            key={paso.titulo}
            className={`rounded-xl border p-3 ${
              activo
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40"
                : completado
                  ? "border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                  : "border-slate-200 opacity-60 dark:border-slate-800"
            }`}
            aria-current={activo ? "step" : undefined}
          >
            <div className="flex items-center gap-2">
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-black ${
                  activo
                    ? "bg-blue-600 text-white"
                    : completado
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {completado ? <Check size={14} /> : numero}
              </span>
              <strong className="text-sm">{paso.titulo}</strong>
            </div>
            <p className="mt-1 pl-8 text-xs leading-5 text-slate-500">
              {paso.descripcion}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export function AyudaPaso({
  titulo,
  children,
  tono = "azul",
}: {
  titulo: string;
  children: ReactNode;
  tono?: "azul" | "ambar" | "verde";
}) {
  const estilos = {
    azul: "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100",
    ambar:
      "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
    verde:
      "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100",
  };
  return (
    <div className={`rounded-xl border p-4 text-sm leading-6 ${estilos[tono]}`}>
      <strong className="block">{titulo}</strong>
      {children}
    </div>
  );
}
