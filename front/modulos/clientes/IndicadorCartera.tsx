import type { ReactNode } from "react";

export function IndicadorCartera({
  icono,
  etiqueta,
  valor,
  detalle,
  alerta = false,
}: {
  icono: ReactNode;
  etiqueta: string;
  valor: string;
  detalle?: string;
  alerta?: boolean;
}) {
  return (
    <article className="panel p-5">
      <div className={alerta ? "text-red-600" : "text-blue-600"}>{icono}</div>
      <p className="mt-4 text-xs font-black uppercase tracking-wide text-slate-500">
        {etiqueta}
      </p>
      <p
        className={`mt-1 text-xl font-semibold ${alerta ? "text-red-600" : ""}`}
      >
        {valor}
      </p>
      {detalle && <p className="mt-1 text-xs text-slate-500">{detalle}</p>}
    </article>
  );
}
