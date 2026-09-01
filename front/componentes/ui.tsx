"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { ReactNode, useEffect, useId, useRef } from "react";
import { usarAplicacion } from "./proveedores";

let modalesBloqueandoScroll = 0;
let overflowAnterior = "";
let paddingAnterior = "";

function bloquearScrollDocumento() {
  if (modalesBloqueandoScroll === 0) {
    overflowAnterior = document.body.style.overflow;
    paddingAnterior = document.body.style.paddingRight;
    const anchoBarra = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (anchoBarra > 0) document.body.style.paddingRight = `${anchoBarra}px`;
  }
  modalesBloqueandoScroll += 1;
  return () => {
    modalesBloqueandoScroll = Math.max(0, modalesBloqueandoScroll - 1);
    if (modalesBloqueandoScroll === 0) {
      document.body.style.overflow = overflowAnterior;
      document.body.style.paddingRight = paddingAnterior;
    }
  };
}

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
  ancho = "normal",
  bloqueado = false,
  children,
}: {
  abierto: boolean;
  cerrar: () => void;
  titulo: string;
  ancho?: "normal" | "amplio" | "pantalla";
  /** Impide cerrar una operación que todavía está confirmándose. */
  bloqueado?: boolean;
  children: ReactNode;
}) {
  const { idioma } = usarAplicacion();
  const tituloId = useId();
  const dialogoRef = useRef<HTMLDivElement>(null);
  const fondoRef = useRef<HTMLDivElement>(null);
  const cerrarRef = useRef(cerrar);
  const bloqueadoRef = useRef(bloqueado);

  useEffect(() => {
    cerrarRef.current = cerrar;
    bloqueadoRef.current = bloqueado;
  }, [cerrar, bloqueado]);

  useEffect(() => {
    if (!abierto) return;

    const focoAnterior =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const liberarScroll = bloquearScrollDocumento();
    const obtenerEnfocables = () =>
      Array.from(
        dialogoRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter(
        (elemento) =>
          elemento.getAttribute("aria-hidden") !== "true" &&
          !elemento.hasAttribute("hidden"),
      );
    const esModalSuperior = () => {
      const modales = document.querySelectorAll("[data-modal-operativo]");
      return modales.item(modales.length - 1) === fondoRef.current;
    };
    const enfocar = requestAnimationFrame(() => {
      const preferido =
        dialogoRef.current?.querySelector<HTMLElement>("[autofocus]") ??
        obtenerEnfocables()[0] ??
        dialogoRef.current;
      preferido?.focus();
    });
    const atenderTeclado = (evento: KeyboardEvent) => {
      if (!esModalSuperior()) return;
      if (evento.key === "Escape") {
        evento.preventDefault();
        evento.stopPropagation();
        if (!bloqueadoRef.current) cerrarRef.current();
        return;
      }
      if (evento.key !== "Tab") return;
      const enfocables = obtenerEnfocables();
      if (enfocables.length === 0) {
        evento.preventDefault();
        dialogoRef.current?.focus();
        return;
      }
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (
        !evento.shiftKey &&
        (document.activeElement === ultimo ||
          !dialogoRef.current?.contains(document.activeElement))
      ) {
        evento.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener("keydown", atenderTeclado, true);
    return () => {
      cancelAnimationFrame(enfocar);
      document.removeEventListener("keydown", atenderTeclado, true);
      liberarScroll();
      if (focoAnterior?.isConnected) focoAnterior.focus();
    };
  }, [abierto]);

  if (!abierto) return null;
  return (
    <div
      ref={fondoRef}
      className="fixed inset-0 z-50 grid place-items-end bg-black/45 p-0 sm:place-items-center sm:p-5"
      data-modal-operativo
    >
      <div
        className="absolute inset-0"
        onClick={() => {
          if (!bloqueado) cerrar();
        }}
        aria-hidden="true"
        data-modal-fondo
      />
      <div
        ref={dialogoRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-busy={bloqueado || undefined}
        tabIndex={-1}
        className={`relative max-h-[92vh] w-full overflow-auto rounded-t-2xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl supports-[height:100dvh]:max-h-[92dvh] dark:bg-slate-900 sm:rounded-2xl sm:p-7 ${ancho === "pantalla" ? "sm:max-w-7xl" : ancho === "amplio" ? "sm:max-w-4xl" : "sm:max-w-2xl"}`}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 id={tituloId} className="text-xl font-semibold">
            {titulo}
          </h2>
          <button
            type="button"
            className="boton-secundario px-3"
            onClick={cerrar}
            disabled={bloqueado}
            aria-label={idioma === "es" ? "Cerrar ventana" : "Close dialog"}
          >
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
