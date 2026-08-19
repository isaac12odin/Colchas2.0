"use client";

import { ReactNode } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { usarAplicacion } from "./proveedores";

export function EncabezadoPagina({
  titulo,
  descripcion,
  accion,
}: {
  titulo: string;
  descripcion: string;
  accion?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {titulo}
        </h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          {descripcion}
        </p>
      </div>
      {accion}
    </div>
  );
}

export function Indicador({
  etiqueta,
  valor,
  detalle,
  icono,
  tono = "azul",
}: {
  etiqueta: string;
  valor: string;
  detalle?: string;
  icono: ReactNode;
  tono?: "azul" | "verde" | "rojo" | "morado";
}) {
  const tonos = {
    azul: "bg-blue-50 text-blue-700 dark:bg-blue-950",
    verde: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950",
    rojo: "bg-red-50 text-red-700 dark:bg-red-950",
    morado: "bg-violet-50 text-violet-700 dark:bg-violet-950",
  };
  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {etiqueta}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{valor}</p>
          {detalle && <p className="mt-1 text-xs text-slate-500">{detalle}</p>}
        </div>
        <span
          className={`grid h-10 w-10 place-items-center rounded-lg ${tonos[tono]}`}
        >
          {icono}
        </span>
      </div>
    </div>
  );
}

export function Modal({
  abierto,
  cerrar,
  titulo,
  children,
}: {
  abierto: boolean;
  cerrar: () => void;
  titulo: string;
  children: ReactNode;
}) {
  if (!abierto) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/45 p-0 sm:place-items-center sm:p-5">
      <button
        className="absolute inset-0"
        onClick={cerrar}
        aria-label="Cerrar"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative max-h-[92vh] w-full overflow-auto rounded-t-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 sm:max-w-2xl sm:rounded-2xl sm:p-7"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{titulo}</h2>
          <button className="boton-secundario px-3" onClick={cerrar}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Paginador({
  pagina,
  totalPaginas,
  cambiar,
}: {
  pagina: number;
  totalPaginas: number;
  cambiar: (pagina: number) => void;
}) {
  const { t } = usarAplicacion();
  return (
    <div className="flex items-center justify-between border-t px-4 py-3">
      <button
        disabled={pagina <= 1}
        onClick={() => cambiar(pagina - 1)}
        className="boton-secundario disabled:opacity-40"
      >
        <ChevronLeft size={17} />
        {t.anterior}
      </button>
      <span className="text-sm text-slate-500">
        {pagina} / {totalPaginas}
      </span>
      <button
        disabled={pagina >= totalPaginas}
        onClick={() => cambiar(pagina + 1)}
        className="boton-secundario disabled:opacity-40"
      >
        {t.siguiente}
        <ChevronRight size={17} />
      </button>
    </div>
  );
}

export function EstadoVacio({ texto }: { texto: string }) {
  return <div className="p-10 text-center text-sm text-slate-500">{texto}</div>;
}

export function MensajeError({ mensaje }: { mensaje: string }) {
  return (
    <div
      role="alert"
      className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
    >
      {mensaje}
    </div>
  );
}
