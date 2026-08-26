import { MonitorCheck, Smartphone } from "lucide-react";

import type { RutaWeb } from "./tipos";

export function EstadoOperacionRuta({
  ruta,
  es,
}: {
  ruta: RutaWeb | undefined;
  es: boolean;
}) {
  if (!ruta) return null;

  const movil = Boolean(ruta.cobradorId && ruta.cobrador);
  const Icono = movil ? Smartphone : MonitorCheck;

  return (
    <div
      className={`mt-4 flex items-start gap-3 rounded-xl border p-3 text-sm ${
        movil
          ? "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100"
          : "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100"
      }`}
      data-capacitacion="rutas.jornada.modo-operacion"
    >
      <Icono className="mt-0.5 shrink-0" size={20} />
      <span>
        <strong className="block">
          {movil
            ? es
              ? `Móvil y web · ${ruta.cobrador?.nombre}`
              : `Mobile and web · ${ruta.cobrador?.nombre}`
            : es
              ? "Sólo administración web"
              : "Web administration only"}
        </strong>
        <span className="mt-1 block text-xs leading-5 opacity-80">
          {movil
            ? es
              ? "La ruta aparece en el móvil del cobrador asignado. Administración también puede registrar la cobranza; el historial conserva quién hizo cada captura."
              : "The route appears on the assigned collector's phone. Administration can also record collections; history keeps the actual operator."
            : es
              ? "No hay cobrador asignado y la ruta no aparece en móvil. Administración puede cobrar desde aquí sin inventar otro usuario."
              : "No collector is assigned, so the route does not appear on mobile. Administration can collect here without a placeholder user."}
        </span>
      </span>
    </div>
  );
}
