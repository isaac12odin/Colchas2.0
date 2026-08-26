"use client";

import {
  BookOpenCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  DatabaseZap,
  Eye,
  LocateFixed,
  LockKeyhole,
  MapPin,
  MousePointerClick,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { pasosAtomicosDe } from "./guionesAtomicos";
import {
  guardarBorradorPractica,
  guardarProgresoCapacitacion,
  leerBorradorPractica,
  leerProgresoCapacitacion,
  registrarAccionPracticaLocal,
} from "./progreso";
import { type LeccionCapacitacion, localizar } from "./tipos";

import {
  clavePermitidaDesde,
  coincideRutaMutacion,
  describirControl,
  esVisible,
  type FasePaso,
  limpiarMarcas,
  objetivosVisibles,
  parametroRuta,
  rutaConPractica,
  SELECTOR_CONTROL,
  valorValido,
} from "./dominioEntrenador";
export function EntrenadorPantallaReal({
  usuarioId,
  leccion,
  idioma,
}: {
  usuarioId: string;
  leccion: LeccionCapacitacion;
  idioma: "es" | "en";
}) {
  const router = useRouter();
  const es = idioma === "es";
  const pasos = useMemo(() => pasosAtomicosDe(leccion), [leccion]);
  const borrador = useMemo(
    () => leerBorradorPractica(usuarioId, leccion.id),
    [leccion.id, usuarioId],
  );
  const pasoInicial = borrador?.terminada
    ? 0
    : Math.min(borrador?.pasoActual ?? 0, Math.max(pasos.length - 1, 0));
  const [pasoActual, establecerPasoActual] = useState(pasoInicial);
  const [fase, establecerFase] = useState<FasePaso>(() =>
    !borrador?.terminada &&
    borrador?.ejecutado &&
    borrador.pasoIdActual === pasos[pasoInicial]?.id
      ? "COMPLETADO"
      : "EJEMPLO",
  );
  const [ejemploAbierto, establecerEjemploAbierto] = useState(true);
  const [objetivoEncontrado, establecerObjetivoEncontrado] = useState(false);
  const [mensaje, establecerMensaje] = useState("");
  const objetivoDesplazado = useRef("");
  const pasoInicialMontado = useRef(false);
  const entidadActiva = useRef<string | undefined>(undefined);
  const paso = pasos[pasoActual];
  const esUltimo = pasoActual === pasos.length - 1;

  useEffect(() => {
    document.documentElement.dataset.capacitacionActiva = "true";
    const fotograma = window.requestAnimationFrame(() =>
      window.scrollTo({ top: 0, behavior: "instant" }),
    );
    return () => {
      window.cancelAnimationFrame(fotograma);
      delete document.documentElement.dataset.capacitacionActiva;
    };
  }, []);

  useEffect(() => {
    if (!paso) return;
    guardarBorradorPractica(usuarioId, leccion.id, {
      pasoActual,
      pasoIdActual: paso.id,
      capturas: {},
      ejecutado: fase === "COMPLETADO",
      terminada: false,
    });
  }, [fase, leccion.id, paso, pasoActual, usuarioId]);

  useEffect(() => {
    if (!pasoInicialMontado.current) {
      pasoInicialMontado.current = true;
      return;
    }
    establecerFase("EJEMPLO");
    establecerEjemploAbierto(true);
    establecerObjetivoEncontrado(false);
    establecerMensaje("");
    objetivoDesplazado.current = "";
  }, [pasoActual]);

  useEffect(() => {
    if (!paso) return;
    let pendiente: ReturnType<typeof setTimeout> | null = null;
    const clavesPermitidas = new Set([
      paso.objetivo.control,
      ...(paso.objetivo.controlesAuxiliares ?? []),
    ]);

    function aplicarBloqueo() {
      limpiarMarcas();
      const objetivos = objetivosVisibles(paso.objetivo.control).filter(
        (objetivo) =>
          !paso.objetivo.usarEntidadActiva ||
          !entidadActiva.current ||
          objetivo.dataset.capacitacionEntidad === entidadActiva.current,
      );
      establecerObjetivoEncontrado(objetivos.length > 0);
      const auxiliares = (paso.objetivo.controlesAuxiliares ?? []).flatMap(
        objetivosVisibles,
      );
      const permitidos =
        fase === "ACTUAR" && paso.objetivo.evento !== "lectura"
          ? [...objetivos, ...auxiliares]
          : [];
      const controles = [
        ...document.querySelectorAll<HTMLElement>(SELECTOR_CONTROL),
      ].filter(
        (elemento) =>
          esVisible(elemento) &&
          !elemento.closest("[data-capacitacion-entrenador]"),
      );
      controles.forEach((control) => {
        const permitido = permitidos.some(
          (objetivo) =>
            objetivo === control ||
            objetivo.contains(control) ||
            control.contains(objetivo),
        );
        if (permitido) return;
        control.dataset.capacitacionBloqueado = "true";
        control.dataset.capacitacionTabindexAnterior =
          control.getAttribute("tabindex") ?? "__sin_atributo__";
        control.dataset.capacitacionAriaAnterior =
          control.getAttribute("aria-disabled") ?? "__sin_atributo__";
        control.setAttribute("tabindex", "-1");
        control.setAttribute("aria-disabled", "true");
      });
      if (fase !== "ACTUAR") return;
      objetivos.forEach(
        (elemento) => (elemento.dataset.capacitacionObjetivo = "true"),
      );
      auxiliares.forEach(
        (elemento) => (elemento.dataset.capacitacionAuxiliar = "true"),
      );
      const primero = objetivos[0];
      const claveDesplazamiento = `${paso.id}:${fase}`;
      if (primero && objetivoDesplazado.current !== claveDesplazamiento) {
        objetivoDesplazado.current = claveDesplazamiento;
        window.setTimeout(
          () =>
            primero.scrollIntoView({
              behavior: "smooth",
              block: "center",
              inline: "nearest",
            }),
          80,
        );
      }
    }

    function programarBloqueo() {
      if (pendiente) clearTimeout(pendiente);
      pendiente = setTimeout(aplicarBloqueo, 40);
    }

    function bloquearEvento(evento: Event) {
      const objetivo = evento.target as HTMLElement | null;
      if (!objetivo || objetivo.closest("[data-capacitacion-entrenador]"))
        return;
      const control =
        objetivo.closest<HTMLElement>(SELECTOR_CONTROL) ?? objetivo;
      if (!control.closest("[data-capacitacion-bloqueado]")) return;
      evento.preventDefault();
      evento.stopPropagation();
      establecerMensaje(
        es
          ? "Ese control no pertenece a este paso. Usa únicamente el control marcado en azul."
          : "That control is not part of this step. Use only the blue control.",
      );
    }

    function completarInteraccion(evento: Event) {
      if (fase !== "ACTUAR") return;
      const objetivoEvento = evento.target as HTMLElement | null;
      if (!objetivoEvento) return;
      const clave = clavePermitidaDesde(objetivoEvento, clavesPermitidas);
      if (clave !== paso.objetivo.control) return;
      const control =
        objetivoEvento.closest<HTMLElement>(SELECTOR_CONTROL) ?? objetivoEvento;
      const esperado = paso.objetivo.evento;
      const confirmarConEnter =
        esperado === "input" &&
        evento.type === "keydown" &&
        evento instanceof KeyboardEvent &&
        evento.key === "Enter" &&
        control instanceof HTMLInputElement;
      const coincide =
        ((esperado === "click" || esperado === "reordenar") &&
          evento.type === "click") ||
        (esperado === "input" &&
          (evento.type === "change" || confirmarConEnter)) ||
        (esperado === "select" &&
          (evento.type === "change" ||
            (evento.type === "click" &&
              control instanceof HTMLSelectElement))) ||
        (esperado === "check" && evento.type === "change") ||
        (esperado === "upload" && evento.type === "change");
      const todosValidos =
        !paso.objetivo.requerirTodosValidos ||
        objetivosVisibles(paso.objetivo.control).every((objetivo) => {
          const controlObjetivo = objetivo.matches(SELECTOR_CONTROL)
            ? objetivo
            : objetivo.querySelector<HTMLElement>(SELECTOR_CONTROL);
          return Boolean(controlObjetivo && valorValido(controlObjetivo));
        });
      const valorNumerico =
        control instanceof HTMLInputElement
          ? Number(control.value)
          : Number.NaN;
      const numeroValido =
        paso.objetivo.numeroMinimo === undefined ||
        (Number.isFinite(valorNumerico) &&
          valorNumerico >= paso.objetivo.numeroMinimo);
      if (
        !coincide ||
        !valorValido(control) ||
        !todosValidos ||
        !numeroValido
      ) {
        if (coincide)
          establecerMensaje(
            es
              ? paso.objetivo.requerirTodosValidos
                ? "Completa cada control marcado en azul antes de continuar."
                : "El control todavía no tiene un valor válido. Revisa el microejemplo y corrígelo."
              : "The control does not have a valid value yet.",
          );
        return;
      }
      if (confirmarConEnter) {
        evento.preventDefault();
        evento.stopPropagation();
      }
      const enlace = objetivoEvento.closest<HTMLAnchorElement>("a[href]");
      let destino: string | null = null;
      if (enlace) {
        const url = new URL(enlace.href, window.location.href);
        const esDescarga =
          enlace.hasAttribute("download") || url.pathname.startsWith("/api/");
        if (!esDescarga) destino = rutaConPractica(enlace.href, leccion.id);
      }
      if (destino) {
        evento.preventDefault();
        evento.stopPropagation();
      }
      registrarAccionPracticaLocal(usuarioId, {
        leccionId: leccion.id,
        paso: pasoActual + 1,
        accion: `${esperado.toUpperCase()}: ${paso.objetivo.control}`,
        valores: [describirControl(control)],
      });
      if (destino) {
        guardarBorradorPractica(usuarioId, leccion.id, {
          pasoActual,
          pasoIdActual: paso.id,
          capturas: {},
          ejecutado: true,
          terminada: false,
        });
      }
      establecerFase("COMPLETADO");
      establecerMensaje("");
      if (destino) {
        router.push(destino);
        return;
      }
      programarBloqueo();
    }

    function completarMutacion(evento: Event) {
      if (fase !== "ACTUAR" || paso.objetivo.evento !== "mutacion-local")
        return;
      const detalle = (evento as CustomEvent<{ metodo: string; ruta: string }>)
        .detail;
      const esperada = paso.objetivo.mutacion;
      if (
        !esperada ||
        detalle.metodo !== esperada.metodo ||
        !coincideRutaMutacion(esperada.ruta, detalle.ruta)
      ) {
        establecerMensaje(
          es
            ? "Se bloqueó una escritura distinta a la esperada. Este paso no avanzó."
            : "A different write was blocked. This step did not advance.",
        );
        return;
      }
      registrarAccionPracticaLocal(usuarioId, {
        leccionId: leccion.id,
        paso: pasoActual + 1,
        accion: `MUTACION_LOCAL: ${detalle.metodo} ${detalle.ruta}`,
        valores: [],
      });
      const entidad = parametroRuta(esperada.ruta, detalle.ruta, "id");
      if (entidad) entidadActiva.current = entidad;
      establecerFase("COMPLETADO");
      establecerMensaje("");
      programarBloqueo();
    }

    const observador = new MutationObserver(programarBloqueo);
    observador.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("pointerdown", bloquearEvento, true);
    document.addEventListener("click", bloquearEvento, true);
    document.addEventListener("keydown", bloquearEvento, true);
    document.addEventListener("beforeinput", bloquearEvento, true);
    document.addEventListener("click", completarInteraccion, true);
    document.addEventListener("keydown", completarInteraccion, true);
    document.addEventListener("change", completarInteraccion, true);
    window.addEventListener(
      "nexo:capacitacion:mutacion-local",
      completarMutacion,
    );
    aplicarBloqueo();
    return () => {
      if (pendiente) clearTimeout(pendiente);
      observador.disconnect();
      document.removeEventListener("pointerdown", bloquearEvento, true);
      document.removeEventListener("click", bloquearEvento, true);
      document.removeEventListener("keydown", bloquearEvento, true);
      document.removeEventListener("beforeinput", bloquearEvento, true);
      document.removeEventListener("click", completarInteraccion, true);
      document.removeEventListener("keydown", completarInteraccion, true);
      document.removeEventListener("change", completarInteraccion, true);
      window.removeEventListener(
        "nexo:capacitacion:mutacion-local",
        completarMutacion,
      );
      limpiarMarcas();
    };
  }, [es, fase, leccion.id, paso, pasoActual, router, usuarioId]);

  useEffect(() => {
    if (!paso || fase !== "ACTUAR" || paso.objetivo.evento !== "lectura")
      return;
    const espera = window.setTimeout(() => {
      if (!objetivosVisibles(paso.objetivo.control).length) return;
      registrarAccionPracticaLocal(usuarioId, {
        leccionId: leccion.id,
        paso: pasoActual + 1,
        accion: `LECTURA_REAL: ${paso.objetivo.control}`,
        valores: [],
      });
      establecerFase("COMPLETADO");
    }, 500);
    return () => window.clearTimeout(espera);
  }, [fase, leccion.id, paso, pasoActual, usuarioId]);

  function continuar() {
    if (!paso || fase !== "COMPLETADO") return;
    if (!esUltimo) {
      establecerPasoActual((actual) => actual + 1);
      return;
    }
    const completadas = leerProgresoCapacitacion(usuarioId);
    guardarProgresoCapacitacion(usuarioId, [
      ...new Set([...completadas, leccion.id]),
    ]);
    guardarBorradorPractica(usuarioId, leccion.id, {
      pasoActual,
      pasoIdActual: paso.id,
      capturas: {},
      ejecutado: true,
      terminada: true,
    });
    registrarAccionPracticaLocal(usuarioId, {
      leccionId: leccion.id,
      paso: pasoActual + 1,
      accion: "GUIA_ATOMICA_COMPLETADA",
      valores: [],
    });
    router.push(`/capacitacion?pantalla=${leccion.pantalla}`);
  }

  if (!paso)
    return (
      <aside
        className="m-4 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-900"
        data-capacitacion-entrenador
      >
        Esta lección todavía no tiene una guía atómica válida.
      </aside>
    );

  return (
    <>
      <style jsx global>{`
        [data-capacitacion-bloqueado="true"] {
          cursor: not-allowed !important;
          opacity: 0.5 !important;
        }
        [data-capacitacion-objetivo="true"] {
          scroll-margin: 9rem;
          outline: 4px solid #2563eb !important;
          outline-offset: 4px !important;
          box-shadow: 0 0 0 8px rgba(37, 99, 235, 0.18) !important;
        }
        [data-capacitacion-auxiliar="true"] {
          outline: 2px dashed #60a5fa !important;
          outline-offset: 3px !important;
        }
        html[data-capacitacion-activa="true"] [data-modal-operativo] {
          position: static !important;
          display: block !important;
          padding: 0 !important;
          background: transparent !important;
        }
        html[data-capacitacion-activa="true"] [data-modal-fondo] {
          display: none !important;
        }
        html[data-capacitacion-activa="true"]
          [data-modal-operativo]
          [role="dialog"] {
          max-height: none !important;
          max-width: none !important;
          border: 1px solid rgb(203 213 225);
          border-radius: 1rem !important;
          box-shadow: none !important;
        }
      `}</style>
      <aside
        className="self-start border-b bg-white dark:border-slate-800 dark:bg-slate-950 xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto xl:rounded-2xl xl:border xl:shadow-sm"
        data-capacitacion-entrenador
        data-testid="entrenador-pantalla-real"
        aria-live="polite"
      >
        <header className="flex items-start gap-3 border-b bg-slate-950 p-4 text-white dark:border-slate-800">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-600">
            <BookOpenCheck size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-blue-200">
              {es
                ? "GUÍA PASO A PASO · PANTALLA REAL"
                : "STEP-BY-STEP · REAL SCREEN"}
            </p>
            <h2 className="mt-1 text-sm font-black">
              {localizar(leccion.titulo, idioma)}
            </h2>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"
            onClick={() =>
              router.push(`/capacitacion?pantalla=${leccion.pantalla}`)
            }
            aria-label={es ? "Salir de la práctica" : "Exit practice"}
          >
            <X size={18} />
          </button>
        </header>

        <div className="p-4">
          <div className="flex items-center justify-between gap-3 text-[11px] font-black">
            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-blue-800 dark:bg-blue-950 dark:text-blue-200">
              {es ? "PASO" : "STEP"} {pasoActual + 1} {es ? "DE" : "OF"}{" "}
              {pasos.length}
            </span>
            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
              <DatabaseZap size={14} />
              {es ? "SIN ESCRIBIR EN LA BD" : "NO DATABASE WRITES"}
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{
                width: `${((pasoActual + (fase === "COMPLETADO" ? 1 : 0)) / pasos.length) * 100}%`,
              }}
            />
          </div>

          <h3 className="mt-4 text-lg font-black leading-6">
            {localizar(paso.titulo, idioma)}
          </h3>
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-xs leading-5 dark:bg-slate-900">
            <MapPin className="mt-0.5 shrink-0 text-blue-600" size={16} />
            <span>
              <strong className="block text-[10px] uppercase tracking-wider text-slate-500">
                {es ? "DÓNDE" : "WHERE"}
              </strong>
              {localizar(paso.ubicacion, idioma)}
            </span>
          </div>

          {(fase === "EJEMPLO" || ejemploAbierto) && (
            <div className="mt-3 space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
              <div className="flex items-start gap-2">
                <Eye className="mt-1 shrink-0" size={17} />
                <div>
                  <strong className="block text-[10px] uppercase tracking-wider">
                    {es ? "ANTES DE TOCAR NADA" : "BEFORE YOU ACT"}
                  </strong>
                  {localizar(paso.antesDeActuar, idioma)}
                </div>
              </div>
              <div className="rounded-xl bg-white/70 p-3 dark:bg-slate-950/40">
                <strong className="block text-[10px] uppercase tracking-wider text-amber-800 dark:text-amber-200">
                  {es
                    ? "MICROEJEMPLO · NO LO COPIES"
                    : "MICRO EXAMPLE · DO NOT COPY"}
                </strong>
                {localizar(paso.microEjemplo, idioma)}
              </div>
            </div>
          )}

          {fase === "EJEMPLO" && (
            <button
              type="button"
              className="boton-primario mt-4 w-full justify-center"
              onClick={() => {
                establecerFase("ACTUAR");
                establecerEjemploAbierto(false);
                establecerMensaje("");
              }}
              data-testid="mostrar-objetivo-practica"
            >
              <LocateFixed size={18} />
              {es ? "Entendido, mostrarme dónde" : "Got it, show me where"}
            </button>
          )}

          {fase !== "EJEMPLO" && (
            <div className="mt-3 rounded-2xl border-2 border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">
                <MousePointerClick size={16} />
                {fase === "COMPLETADO"
                  ? es
                    ? "PASO COMPROBADO"
                    : "STEP VERIFIED"
                  : es
                    ? "AHORA HAZ SÓLO ESTO"
                    : "NOW DO ONLY THIS"}
              </p>
              <p className="mt-2 text-sm font-black leading-6">
                {fase === "COMPLETADO"
                  ? localizar(paso.verificacion, idioma)
                  : localizar(paso.accion, idioma)}
              </p>
              {fase === "ACTUAR" && !objetivoEncontrado && (
                <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-800 dark:bg-red-950/40 dark:text-red-200">
                  {es
                    ? "El control esperado todavía no está visible. Revisa que completaste el paso anterior; no se habilitó ningún sustituto."
                    : "The expected control is not visible. No substitute was enabled."}
                </p>
              )}
              {fase === "ACTUAR" && objetivoEncontrado && (
                <div className="mt-3 space-y-2 text-xs leading-5 text-blue-900 dark:text-blue-100">
                  <p className="flex items-start gap-2">
                    <LockKeyhole className="mt-0.5 shrink-0" size={15} />
                    {es
                      ? "Sólo funciona el control marcado en azul. Los demás clics y teclas están bloqueados."
                      : "Only the blue control works. All others are blocked."}
                  </p>
                  {paso.objetivo.evento === "input" && (
                    <p className="font-bold">
                      {es
                        ? "Termina el dato completo y presiona Tab o Enter para comprobarlo."
                        : "Finish the full value, then press Tab or Enter to verify it."}
                    </p>
                  )}
                </div>
              )}
              {fase === "COMPLETADO" && (
                <p
                  className="mt-3 flex items-start gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-200"
                  data-testid="accion-real-detectada"
                >
                  <CheckCircle2 className="mt-0.5 shrink-0" size={16} />
                  {es
                    ? "La acción exacta fue verificada."
                    : "The exact action was verified."}
                </p>
              )}
            </div>
          )}

          {fase !== "EJEMPLO" && (
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-blue-700 underline underline-offset-4 dark:text-blue-300"
              onClick={() => establecerEjemploAbierto((actual) => !actual)}
            >
              <Eye size={15} />
              {ejemploAbierto
                ? es
                  ? "Ocultar microejemplo"
                  : "Hide example"
                : es
                  ? "Volver a ver el microejemplo"
                  : "Show example again"}
            </button>
          )}

          {mensaje && (
            <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-800 dark:bg-red-950/40 dark:text-red-200">
              {mensaje}
            </p>
          )}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className="boton-secundario px-3"
              onClick={() =>
                pasoActual > 0 && establecerPasoActual((actual) => actual - 1)
              }
              disabled={pasoActual === 0}
              aria-label={es ? "Paso anterior" : "Previous step"}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              className="boton-primario flex-1 justify-center"
              disabled={fase !== "COMPLETADO"}
              onClick={continuar}
              data-testid="continuar-practica-real"
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
        </div>
      </aside>
    </>
  );
}
