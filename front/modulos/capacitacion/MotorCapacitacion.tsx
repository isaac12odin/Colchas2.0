"use client";

import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  Gamepad2,
  Layers3,
  LockKeyhole,
  Monitor,
  PlayCircle,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { usarAplicacion } from "@/componentes/proveedores";
import type { Rol } from "@/lib/tipos";
import {
  leccionesCapacitacion,
  leccionesParaRol,
  puntosPorLeccion,
} from "./catalogo";
import { PracticaFlujoReal } from "./PracticaFlujoReal";
import {
  guardarProgresoCapacitacion,
  leerProgresoCapacitacion,
  registrarAccionPracticaLocal,
} from "./progreso";
import { contextoDeLeccion, rutaAprendizajeParaRol } from "./rutasAprendizaje";
import { SimuladorCriticoWeb } from "./simuladores/SimuladorCriticoWeb";
import { type LeccionCapacitacion, localizar } from "./tipos";

const etiquetasRol: Record<Rol, { es: string; en: string }> = {
  ADMINISTRADOR: { es: "Administrador", en: "Administrator" },
  CONTABLE: { es: "Contabilidad", en: "Accounting" },
  VENDEDOR: { es: "Ventas", en: "Sales" },
  ALMACENISTA: { es: "Almacén", en: "Warehouse" },
  COBRADOR: { es: "Cobranza", en: "Collections" },
};

type FiltroPlataforma = "TODAS" | "WEB" | "MOVIL";

export function MotorCapacitacion() {
  const { usuario, idioma } = usarAplicacion();
  const router = useRouter();
  const es = idioma === "es";
  const [rolVista, establecerRolVista] = useState<Rol>(
    usuario?.rol ?? "ADMINISTRADOR",
  );
  const [plataforma, establecerPlataforma] =
    useState<FiltroPlataforma>("TODAS");
  const [busqueda, establecerBusqueda] = useState("");
  const [completadas, establecerCompletadas] = useState<string[]>([]);
  const [activa, establecerActiva] = useState<LeccionCapacitacion | null>(null);
  const [terminada, establecerTerminada] = useState(false);
  const [mostrarPreparacion, establecerMostrarPreparacion] = useState(true);

  useEffect(() => {
    if (!usuario) return;
    establecerRolVista(usuario.rol);
    establecerCompletadas(leerProgresoCapacitacion(usuario.id));
    const pantalla = new URL(window.location.href).searchParams.get("pantalla");
    if (pantalla) establecerBusqueda(pantalla);
  }, [usuario]);

  const disponibles = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase(idioma);
    return leccionesParaRol(rolVista).filter(
      (leccion) =>
        (plataforma === "TODAS" || leccion.plataforma === plataforma) &&
        (!termino ||
          leccion.pantalla.toLocaleLowerCase().includes(termino) ||
          localizar(leccion.titulo, idioma)
            .toLocaleLowerCase(idioma)
            .includes(termino) ||
          localizar(leccion.objetivo, idioma)
            .toLocaleLowerCase(idioma)
            .includes(termino)),
    );
  }, [busqueda, idioma, plataforma, rolVista]);

  if (!usuario) return null;
  const usuarioId = usuario.id;
  const rutaAprendizaje = rutaAprendizajeParaRol(rolVista);

  const idsDelRol = new Set(leccionesParaRol(rolVista).map(({ id }) => id));
  const completadasDelRol = completadas.filter((id) => idsDelRol.has(id));
  const totalRol = idsDelRol.size;
  const porcentaje = totalRol
    ? Math.round((completadasDelRol.length / totalRol) * 100)
    : 0;
  const puntos = completadas.length * puntosPorLeccion;
  const nivel = Math.floor(puntos / 500) + 1;
  const idsDisponibles = new Set(disponibles.map(({ id }) => id));
  const etapasVisibles = rutaAprendizaje.etapas
    .map((etapa) => ({
      etapa,
      lecciones: etapa.lecciones
        .map((id) => leccionesCapacitacion.find((leccion) => leccion.id === id))
        .filter(
          (leccion): leccion is LeccionCapacitacion =>
            leccion !== undefined && idsDisponibles.has(leccion.id),
        ),
    }))
    .filter(({ lecciones }) => lecciones.length > 0);
  const siguienteId = rutaAprendizaje.etapas
    .flatMap(({ lecciones }) => lecciones)
    .find((id) => idsDelRol.has(id) && !completadas.includes(id));
  const siguienteLeccion = siguienteId
    ? leccionesCapacitacion.find(({ id }) => id === siguienteId)
    : undefined;

  function abrir(leccion: LeccionCapacitacion) {
    if (leccion.rutaReal) {
      router.push(
        `${leccion.rutaReal}?practica=${encodeURIComponent(leccion.id)}`,
      );
      return;
    }
    establecerActiva(leccion);
    establecerTerminada(false);
    establecerMostrarPreparacion(true);
  }

  function cerrar() {
    establecerActiva(null);
    establecerTerminada(false);
    establecerMostrarPreparacion(true);
  }

  function completarActiva() {
    if (!activa) return;
    const nuevas = [...new Set([...completadas, activa.id])];
    establecerCompletadas(nuevas);
    guardarProgresoCapacitacion(usuarioId, nuevas);
    registrarAccionPracticaLocal(usuarioId, {
      leccionId: activa.id,
      paso: activa.pasos.length,
      accion: "PRACTICA_COMPLETADA",
      valores: [],
    });
    establecerTerminada(true);
  }

  function reiniciar() {
    if (
      !window.confirm(
        es
          ? "¿Reiniciar sólo tu progreso de capacitación en este navegador?"
          : "Reset only your training progress in this browser?",
      )
    )
      return;
    establecerCompletadas([]);
    guardarProgresoCapacitacion(usuarioId, []);
  }

  return (
    <div className="space-y-6" data-testid="centro-capacitacion">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#071f4e] via-[#0f62fe] to-[#4589ff] p-6 text-white shadow-xl sm:p-8">
        <div className="grid gap-7 lg:grid-cols-[1.4fr_.8fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold backdrop-blur">
              <Gamepad2 size={16} />
              {es ? "Aprender haciendo" : "Learn by doing"}
            </span>
            <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">
              {es
                ? "Plan de puesta en marcha y capacitación"
                : "Setup and training plan"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50 sm:text-base">
              {es
                ? "Empieza por lo que debes reunir y después practica directamente sobre la misma pantalla y los mismos formularios del módulo real."
                : "Start with what you need, then practice directly on the same screen and forms used by the real module."}
            </p>
            <div
              className="mt-5 inline-flex max-w-xl items-start gap-3 rounded-2xl bg-emerald-400/15 p-3 text-sm text-emerald-50 ring-1 ring-emerald-200/30"
              data-testid="capacitacion-sin-db"
            >
              <ShieldCheck className="mt-0.5 shrink-0" size={19} />
              <span>
                <strong>{es ? "Simulador seguro:" : "Safe simulator:"}</strong>{" "}
                {es
                  ? "consulta la pantalla real, pero intercepta cada escritura y la guarda sólo en este navegador; no modifica la base de datos."
                  : "it loads the real screen, but intercepts every write and stores it only in this browser; the database is not changed."}
              </span>
            </div>
          </div>
          <div className="rounded-2xl bg-white/12 p-5 ring-1 ring-white/20 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-100">
                  {es ? "Tu nivel" : "Your level"}
                </p>
                <p className="mt-1 text-3xl font-black">{nivel}</p>
              </div>
              <Trophy size={42} className="text-yellow-300" />
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-yellow-300 transition-all"
                style={{ width: `${porcentaje}%` }}
              />
            </div>
            <div className="mt-3 flex justify-between text-xs text-blue-50">
              <span>
                {completadasDelRol.length}/{totalRol}{" "}
                {es ? "prácticas" : "practices"}
              </span>
              <span>{puntos} XP</span>
            </div>
          </div>
        </div>
      </section>

      <section
        className="panel overflow-hidden"
        data-testid="plan-puesta-en-marcha"
      >
        <div className="border-b bg-slate-50 p-5 dark:bg-slate-900 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-blue-600">
                {es ? "TU ORDEN DE APRENDIZAJE" : "YOUR LEARNING ORDER"}
              </p>
              <h2 className="mt-2 text-2xl font-black">
                {localizar(rutaAprendizaje.titulo, idioma)}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {localizar(rutaAprendizaje.descripcion, idioma)}
              </p>
            </div>
            {siguienteLeccion && (
              <button
                className="boton-primario shrink-0"
                onClick={() => abrir(siguienteLeccion)}
                data-testid="continuar-plan-capacitacion"
              >
                <PlayCircle size={18} />
                {es ? "Continuar por donde voy" : "Continue my plan"}
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[.9fr_1.35fr]">
          <div className="border-b p-5 dark:border-slate-800 lg:border-b-0 lg:border-r sm:p-6">
            <div className="flex items-center gap-2 text-sm font-black">
              <ClipboardList size={19} className="text-blue-600" />
              {es ? "Antes de capturar, reúne esto" : "Gather this first"}
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {es
                ? "No empieces a crear registros a ciegas. Ten estos datos revisados."
                : "Do not create records blindly. Review this information first."}
            </p>
            <ol className="mt-4 space-y-3">
              {rutaAprendizaje.antesDeEmpezar.map((requisito, indice) => (
                <li
                  key={localizar(requisito, idioma)}
                  className="flex gap-3 rounded-xl bg-blue-50 p-3 text-sm leading-5 text-blue-950 dark:bg-blue-950/35 dark:text-blue-100"
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-600 text-[11px] font-black text-white">
                    {indice + 1}
                  </span>
                  {localizar(requisito, idioma)}
                </li>
              ))}
            </ol>
          </div>

          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-2 text-sm font-black">
              <Layers3 size={19} className="text-blue-600" />
              {es
                ? "Orden correcto de configuración y uso"
                : "Correct setup and use order"}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {rutaAprendizaje.etapas.map((etapa, indice) => {
                const idsEtapa = etapa.lecciones.filter((id) =>
                  idsDelRol.has(id),
                );
                const hechas = idsEtapa.filter((id) =>
                  completadas.includes(id),
                ).length;
                const completa =
                  idsEtapa.length > 0 && hechas === idsEtapa.length;
                return (
                  <a
                    key={etapa.id}
                    href={`#etapa-${etapa.id}`}
                    className={`rounded-2xl border p-4 transition hover:border-blue-400 ${
                      completa
                        ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                        : "bg-white dark:bg-slate-950"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-950 text-xs font-black text-white dark:bg-blue-600">
                        {indice + 1}
                      </span>
                      {completa ? (
                        <CheckCircle2 size={19} className="text-emerald-600" />
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500">
                          {hechas}/{idsEtapa.length}
                        </span>
                      )}
                    </div>
                    <strong className="mt-3 block text-sm leading-5">
                      {localizar(etapa.titulo, idioma)}
                    </strong>
                    <span className="mt-2 block text-xs leading-5 text-slate-500">
                      {localizar(etapa.dejarasListo, idioma)}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="panel p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-black">
          <Settings2 size={18} className="text-blue-600" />
          {es ? "Buscar una ayuda específica" : "Find specific help"}
        </div>
        <div className="grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-end">
          <label>
            <span className="etiqueta">
              {es ? "Buscar pantalla o resultado" : "Search screen or result"}
            </span>
            <input
              className="campo"
              placeholder={
                es
                  ? "Ej. pedidos, abono, crédito…"
                  : "E.g. orders, payment, credit…"
              }
              value={busqueda}
              onChange={(evento) => establecerBusqueda(evento.target.value)}
            />
          </label>
          <div>
            <span className="etiqueta">{es ? "Plataforma" : "Platform"}</span>
            <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
              {(["TODAS", "WEB", "MOVIL"] as const).map((valor) => (
                <button
                  key={valor}
                  className={`min-h-10 rounded-lg px-3 text-xs font-bold ${
                    plataforma === valor
                      ? "bg-white text-blue-700 shadow-sm dark:bg-slate-800 dark:text-blue-300"
                      : "text-slate-500"
                  }`}
                  onClick={() => establecerPlataforma(valor)}
                >
                  {valor === "TODAS" ? (es ? "Todas" : "All") : valor}
                </button>
              ))}
            </div>
          </div>
          {usuario.rol === "ADMINISTRADOR" ? (
            <label>
              <span className="etiqueta">
                {es ? "Vista por rol" : "Role view"}
              </span>
              <select
                className="campo min-w-44"
                value={rolVista}
                onChange={(evento) =>
                  establecerRolVista(evento.target.value as Rol)
                }
                data-testid="selector-rol-capacitacion"
              >
                {(Object.keys(etiquetasRol) as Rol[]).map((rol) => (
                  <option key={rol} value={rol}>
                    {etiquetasRol[rol][idioma]}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-900">
              <span className="block text-[10px] font-bold uppercase text-slate-500">
                {es ? "Ruta asignada" : "Assigned path"}
              </span>
              <strong>{etiquetasRol[rolVista][idioma]}</strong>
            </div>
          )}
        </div>
      </section>

      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">
            {es
              ? "Aprende por etapas, en este orden"
              : "Learn in stages, in this order"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {es
              ? `${disponibles.length} prácticas disponibles. Cada una explica requisitos, captura y resultado.`
              : `${disponibles.length} practices available. Each explains prerequisites, entry, and outcome.`}
          </p>
        </div>
        {completadas.length > 0 && (
          <button
            className="boton-secundario px-3"
            onClick={reiniciar}
            title={es ? "Reiniciar progreso" : "Reset progress"}
          >
            <RotateCcw size={17} />
            <span className="hidden sm:inline">
              {es ? "Reiniciar" : "Reset"}
            </span>
          </button>
        )}
      </div>

      <div className="space-y-6">
        {etapasVisibles.map(({ etapa, lecciones }) => {
          const indiceReal = rutaAprendizaje.etapas.findIndex(
            ({ id }) => id === etapa.id,
          );
          return (
            <section
              className="panel overflow-hidden"
              id={`etapa-${etapa.id}`}
              key={etapa.id}
              data-testid={`etapa-capacitacion-${etapa.id}`}
            >
              <div className="grid gap-4 border-b bg-slate-50 p-5 dark:bg-slate-900 lg:grid-cols-[auto_1fr_.9fr] lg:items-center sm:p-6">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 text-lg font-black text-white shadow-md shadow-blue-200 dark:shadow-none">
                  {indiceReal + 1}
                </span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                    {es ? `ETAPA ${indiceReal + 1}` : `STAGE ${indiceReal + 1}`}
                  </p>
                  <h3 className="mt-1 text-xl font-black">
                    {localizar(etapa.titulo, idioma)}
                  </h3>
                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    {localizar(etapa.descripcion, idioma)}
                  </p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                  <strong className="block">
                    {es ? "Antes necesitas" : "You need first"}
                  </strong>
                  {localizar(etapa.necesitas, idioma)}
                </div>
              </div>

              <div className="divide-y dark:divide-slate-800">
                {lecciones.map((leccion, indiceLeccion) => (
                  <TarjetaLeccionRuta
                    key={leccion.id}
                    leccion={leccion}
                    numero={indiceLeccion + 1}
                    idioma={idioma}
                    completa={completadas.includes(leccion.id)}
                    esSiguiente={leccion.id === siguienteId}
                    abrir={() => abrir(leccion)}
                  />
                ))}
              </div>

              <div className="flex items-start gap-3 bg-emerald-50 p-4 text-xs leading-5 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100 sm:px-6">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                <span>
                  <strong>
                    {es ? "Al terminar esta etapa: " : "After this stage: "}
                  </strong>
                  {localizar(etapa.dejarasListo, idioma)}
                </span>
              </div>
            </section>
          );
        })}
      </div>

      {disponibles.length === 0 && (
        <div className="panel grid min-h-52 place-items-center p-8 text-center text-sm text-slate-500">
          {es
            ? "No encontré un recorrido con esos filtros."
            : "No walkthrough matches those filters."}
        </div>
      )}

      {activa && (
        <SimuladorLeccion
          usuarioId={usuarioId}
          leccion={activa}
          idioma={idioma}
          terminada={terminada}
          contexto={contextoDeLeccion(rolVista, activa.id)}
          mostrarPreparacion={mostrarPreparacion}
          alComenzar={() => establecerMostrarPreparacion(false)}
          alCompletarSimulador={completarActiva}
          alCerrar={cerrar}
        />
      )}
    </div>
  );
}

function TarjetaLeccionRuta({
  leccion,
  numero,
  idioma,
  completa,
  esSiguiente,
  abrir,
}: {
  leccion: LeccionCapacitacion;
  numero: number;
  idioma: "es" | "en";
  completa: boolean;
  esSiguiente: boolean;
  abrir: () => void;
}) {
  const es = idioma === "es";
  return (
    <article
      className={`grid gap-4 p-5 sm:p-6 lg:grid-cols-[52px_1fr_auto] lg:items-center ${
        esSiguiente ? "bg-blue-50/70 dark:bg-blue-950/20" : ""
      }`}
    >
      <div
        className={`grid h-12 w-12 place-items-center rounded-full border-2 text-sm font-black ${
          completa
            ? "border-emerald-600 bg-emerald-600 text-white"
            : esSiguiente
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-slate-300 text-slate-500 dark:border-slate-700"
        }`}
      >
        {completa ? <CheckCircle2 size={22} /> : numero}
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-blue-600">
            {leccion.plataforma === "WEB" ? (
              <Monitor size={13} />
            ) : (
              <Smartphone size={13} />
            )}
            {leccion.pantalla} · {leccion.plataforma}
          </span>
          {esSiguiente && !completa && (
            <span className="rounded-full bg-yellow-200 px-2 py-1 text-[10px] font-black text-yellow-950">
              {es ? "SIGUE CON ESTO" : "DO THIS NEXT"}
            </span>
          )}
          {completa && (
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              {es ? "COMPLETADA" : "COMPLETED"}
            </span>
          )}
        </div>
        <h4 className="mt-2 text-lg font-black">
          {localizar(leccion.titulo, idioma)}
        </h4>
        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
          <strong>
            {es ? "Vas a crear/configurar: " : "You will create/configure: "}
          </strong>
          {localizar(leccion.objetivo, idioma)}
        </p>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          <strong>{es ? "Debe quedar: " : "Expected result: "}</strong>
          {localizar(leccion.resultado, idioma)}
        </p>
        <p className="mt-2 text-[11px] font-bold text-blue-700 dark:text-blue-300">
          {es ? "Responsable: " : "Owner: "}
          {localizar(leccion.responsable, idioma)}
        </p>
      </div>
      <button
        className={completa ? "boton-secundario" : "boton-primario"}
        onClick={abrir}
      >
        {completa ? <RotateCcw size={17} /> : <Sparkles size={17} />}
        {completa
          ? es
            ? "Repetir práctica"
            : "Repeat practice"
          : leccion.rutaReal
            ? es
              ? "Practicar en la pantalla real"
              : "Practice on the real screen"
            : es
              ? "Ver requisitos y practicar"
              : "Review requirements and practice"}
        <ArrowRight size={17} />
      </button>
    </article>
  );
}

function SimuladorLeccion({
  usuarioId,
  leccion,
  idioma,
  terminada,
  contexto,
  mostrarPreparacion,
  alComenzar,
  alCompletarSimulador,
  alCerrar,
}: {
  usuarioId: string;
  leccion: LeccionCapacitacion;
  idioma: "es" | "en";
  terminada: boolean;
  contexto: ReturnType<typeof contextoDeLeccion>;
  mostrarPreparacion: boolean;
  alComenzar: () => void;
  alCompletarSimulador: () => void;
  alCerrar: () => void;
}) {
  const es = idioma === "es";
  const porcentaje = mostrarPreparacion ? 0 : terminada ? 100 : 35;

  useEffect(() => {
    const desbordamientoAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = desbordamientoAnterior;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={localizar(leccion.titulo, idioma)}
    >
      <div className="max-h-[96vh] w-full max-w-6xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl dark:bg-slate-950 sm:rounded-3xl">
        <div className="sticky top-0 z-10 border-b bg-white/95 p-5 backdrop-blur dark:bg-slate-950/95 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-blue-600">
                {es
                  ? "Flujo operativo simulado · guardado local · sin afectar datos"
                  : "Simulated operational flow · local save · no data affected"}
              </p>
              <h2 className="mt-1 text-xl font-black sm:text-2xl">
                {localizar(leccion.titulo, idioma)}
              </h2>
            </div>
            <button
              onClick={alCerrar}
              className="boton-secundario px-3"
              aria-label={es ? "Cerrar" : "Close"}
            >
              <X size={19} />
            </button>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${porcentaje}%` }}
            />
          </div>
        </div>

        {mostrarPreparacion ? (
          <div className="grid gap-0 lg:grid-cols-[.82fr_1.18fr]">
            <div className="bg-blue-700 p-7 text-white sm:p-9">
              <p className="text-xs font-black uppercase tracking-[.18em] text-blue-100">
                {contexto
                  ? es
                    ? `ETAPA ${contexto.indiceEtapa + 1} · PRÁCTICA ${contexto.indiceLeccion + 1}`
                    : `STAGE ${contexto.indiceEtapa + 1} · PRACTICE ${contexto.indiceLeccion + 1}`
                  : es
                    ? "PRÁCTICA GUIADA"
                    : "GUIDED PRACTICE"}
              </p>
              <h3 className="mt-4 text-3xl font-black leading-tight">
                {es
                  ? "Primero entiende qué necesitas"
                  : "First understand what you need"}
              </h3>
              <p className="mt-4 text-sm leading-6 text-blue-100">
                {es
                  ? "No vas a pulsar botones sin contexto. Revisa la dependencia, lo que vas a capturar y el resultado esperado."
                  : "You will not press buttons without context. Review the dependency, what you will enter, and the expected result."}
              </p>
              <div className="mt-7 rounded-2xl bg-white/10 p-4 ring-1 ring-white/20">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-yellow-200">
                  <LockKeyhole size={17} />
                  {es ? "Antes de comenzar" : "Before you begin"}
                </div>
                <p className="mt-3 text-sm font-bold leading-6">
                  {contexto
                    ? localizar(contexto.etapa.necesitas, idioma)
                    : localizar(leccion.responsable, idioma)}
                </p>
              </div>
            </div>
            <div className="p-6 sm:p-9">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border p-5">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-blue-600">
                    <Settings2 size={18} />
                    {es
                      ? "Qué vas a crear o configurar"
                      : "What you will create or configure"}
                  </div>
                  <p className="mt-3 text-sm font-bold leading-6">
                    {localizar(leccion.objetivo, idioma)}
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 size={18} />
                    {es ? "Qué debe quedar al terminar" : "Expected result"}
                  </div>
                  <p className="mt-3 text-sm font-bold leading-6">
                    {localizar(leccion.resultado, idioma)}
                  </p>
                </div>
              </div>
              <div className="mt-5 rounded-2xl bg-slate-100 p-5 dark:bg-slate-900">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                  {es ? "Lo practicarás en este orden" : "Practice order"}
                </p>
                <ol className="mt-4 space-y-3">
                  {leccion.pasos.map((pasoLeccion, indice) => (
                    <li
                      key={localizar(pasoLeccion.accion, idioma)}
                      className="flex items-start gap-3 text-sm"
                    >
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-[11px] font-black text-blue-700 shadow-sm dark:bg-slate-800">
                        {indice + 1}
                      </span>
                      <span>
                        <strong className="block">
                          {localizar(pasoLeccion.accion, idioma)}
                        </strong>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {localizar(pasoLeccion.instruccion, idioma)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button className="boton-secundario" onClick={alCerrar}>
                  {es ? "Todavía no" : "Not yet"}
                </button>
                <button
                  className="boton-primario"
                  onClick={alComenzar}
                  data-testid="comenzar-practica-guiada"
                >
                  <PlayCircle size={18} />
                  {es
                    ? "Ya tengo lo necesario: comenzar"
                    : "I have what I need: start"}
                </button>
              </div>
            </div>
          </div>
        ) : terminada ? (
          <div
            className="p-7 text-center sm:p-10"
            data-testid="leccion-completada"
          >
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-yellow-100 text-yellow-700">
              <Trophy size={42} />
            </div>
            <p className="mt-5 text-sm font-bold text-blue-600">
              +{puntosPorLeccion} XP
            </p>
            <h3 className="mt-2 text-2xl font-black">
              {leccion.tipoSimulador
                ? es
                  ? "Simulación resuelta"
                  : "Simulation solved"
                : es
                  ? "Recorrido guiado completado"
                  : "Guided walkthrough completed"}
            </h3>
            <div className="mx-auto mt-5 max-w-xl rounded-2xl bg-emerald-50 p-5 text-left text-sm leading-6 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100">
              <strong className="block">
                {es ? "Resultado obtenido" : "Result achieved"}
              </strong>
              {localizar(leccion.resultado, idioma)}
            </div>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button className="boton-secundario" onClick={alCerrar}>
                {es ? "Volver a recorridos" : "Back to walkthroughs"}
              </button>
              {leccion.rutaReal && (
                <Link
                  className="boton-primario"
                  href={leccion.rutaReal}
                  onClick={alCerrar}
                >
                  <BookOpenCheck size={18} />{" "}
                  {es ? "Ir a la pantalla real" : "Open real screen"}
                </Link>
              )}
            </div>
          </div>
        ) : leccion.tipoSimulador ? (
          <SimuladorCriticoWeb
            key={leccion.id}
            tipo={leccion.tipoSimulador}
            idioma={idioma}
            alCompletar={alCompletarSimulador}
          />
        ) : (
          <PracticaFlujoReal
            key={leccion.id}
            usuarioId={usuarioId}
            leccion={leccion}
            idioma={idioma}
            alCompletar={alCompletarSimulador}
          />
        )}
      </div>
    </div>
  );
}
