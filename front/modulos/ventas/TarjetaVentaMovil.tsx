import { ChevronDown, ChevronUp, UserRound } from "lucide-react";
import type { ReactNode } from "react";

import type { VentaWeb } from "./tipos";

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export function TarjetaVentaMovil({
  venta,
  es,
  abierta,
  cargando,
  alAlternar,
  children,
}: {
  venta: VentaWeb;
  es: boolean;
  abierta: boolean;
  cargando: boolean;
  alAlternar: () => void;
  children?: ReactNode;
}) {
  return (
    <article
      className="space-y-4 border-b p-4 last:border-b-0"
      data-capacitacion="ventas.lista.fila"
      data-testid="venta-tarjeta-movil"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-all font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
            {venta.folio}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {new Date(venta.fechaVenta).toLocaleDateString(
              es ? "es-MX" : "en-US",
            )}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-200">
          {venta.tipo === "CREDITO"
            ? es
              ? "Crédito"
              : "Credit"
            : venta.tipo === "CONTADO"
              ? es
                ? "Contado"
                : "Cash"
              : es
                ? "Público"
                : "Public"}
        </span>
      </div>

      <div className="flex items-start gap-2">
        <UserRound
          className="mt-0.5 shrink-0 text-slate-400"
          size={17}
          aria-hidden
        />
        <div className="min-w-0">
          <strong className="block truncate text-sm">
            {venta.cliente?.nombreCompleto ??
              (es ? "Público general" : "General public")}
          </strong>
          <small className="block truncate text-slate-500">
            {es ? "Registró" : "Created by"}: {venta.usuario.nombre}
          </small>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
        <div>
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {es ? "Anticipo" : "Deposit"}
          </span>
          <strong>{dinero.format(Number(venta.anticipo))}</strong>
        </div>
        <div className="text-right">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Total
          </span>
          <strong className="text-lg text-blue-700 dark:text-blue-300">
            {dinero.format(Number(venta.total))}
          </strong>
        </div>
      </div>

      <button
        type="button"
        className="boton-secundario w-full"
        onClick={alAlternar}
        disabled={cargando}
        aria-expanded={abierta}
        data-capacitacion="ventas.detalle.abrir"
      >
        {abierta ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        {cargando ? "…" : es ? "Ver detalle" : "View details"}
      </button>

      {abierta && children && (
        <div
          className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950"
          data-capacitacion="ventas.detalle"
        >
          {children}
        </div>
      )}
    </article>
  );
}
