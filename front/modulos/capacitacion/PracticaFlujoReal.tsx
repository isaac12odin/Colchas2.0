"use client";

import {
  CheckCircle2,
  ChevronRight,
  Download,
  FileSpreadsheet,
  LockKeyhole,
  Search,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  guardarBorradorPractica,
  leerBorradorPractica,
  registrarAccionPracticaLocal,
  type CapturaPasoPractica,
} from "./progreso";
import { localizar, type LeccionCapacitacion } from "./tipos";

import {
  capturaVacia,
  type Idioma,
  perfilPantalla,
  tipoControl,
} from "./perfilesPractica";

export function PracticaFlujoReal({
  usuarioId,
  leccion,
  idioma,
  alCompletar,
}: {
  usuarioId: string;
  leccion: LeccionCapacitacion;
  idioma: Idioma;
  alCompletar: () => void;
}) {
  const es = idioma === "es";
  const inicial = useMemo(
    () => leerBorradorPractica(usuarioId, leccion.id),
    [leccion.id, usuarioId],
  );
  const [pasoActual, establecerPasoActual] = useState(
    Math.min(inicial?.pasoActual ?? 0, leccion.pasos.length - 1),
  );
  const [capturas, establecerCapturas] = useState<
    Record<string, CapturaPasoPractica>
  >(inicial?.capturas ?? {});
  const [ejecutado, establecerEjecutado] = useState(
    inicial?.ejecutado ?? false,
  );
  const paso = leccion.pasos[pasoActual]!;
  const accion = localizar(paso.accion, idioma);
  const control = tipoControl(accion);
  const esDescarga =
    control === "ARCHIVO" && /descargar|download/i.test(accion);
  const perfil = perfilPantalla(leccion.pantalla, idioma);
  const captura = capturas[String(pasoActual)] ?? capturaVacia;

  useEffect(() => {
    guardarBorradorPractica(usuarioId, leccion.id, {
      pasoActual,
      capturas,
      ejecutado,
      terminada: false,
    });
  }, [capturas, ejecutado, leccion.id, pasoActual, usuarioId]);

  function actualizar(cambios: Partial<CapturaPasoPractica>) {
    establecerCapturas((actuales) => ({
      ...actuales,
      [String(pasoActual)]: {
        ...(actuales[String(pasoActual)] ?? capturaVacia),
        ...cambios,
      },
    }));
    establecerEjecutado(false);
  }

  const puedeEjecutar =
    control === "BUSQUEDA"
      ? captura.primario.trim().length >= 2
      : control === "CAPTURA"
        ? captura.primario.trim().length >= 2 &&
          captura.secundario.trim().length >= 2
        : control === "ARCHIVO"
          ? esDescarga || captura.archivo.length > 0
          : captura.verificado;

  function ejecutarPaso() {
    if (!puedeEjecutar || ejecutado) return;
    if (esDescarga) {
      const contenido = es
        ? "cliente,tarjeta,saldo,orden\nMaría López,0042,850,1\n"
        : "customer,card,balance,order\nMaria Lopez,0042,850,1\n";
      const enlace = document.createElement("a");
      const url = URL.createObjectURL(
        new Blob([contenido], { type: "text/csv;charset=utf-8" }),
      );
      enlace.href = url;
      enlace.download = "plantilla-practica-nexo.csv";
      enlace.click();
      URL.revokeObjectURL(url);
    }
    registrarAccionPracticaLocal(usuarioId, {
      leccionId: leccion.id,
      paso: pasoActual + 1,
      accion,
      valores: [captura.primario, captura.secundario, captura.archivo],
    });
    establecerEjecutado(true);
  }

  function continuar() {
    if (!ejecutado) return;
    if (pasoActual === leccion.pasos.length - 1) {
      guardarBorradorPractica(usuarioId, leccion.id, {
        pasoActual,
        capturas,
        ejecutado: true,
        terminada: true,
      });
      alCompletar();
      return;
    }
    establecerPasoActual((actual) => actual + 1);
    establecerEjecutado(false);
  }

  return (
    <div
      className="grid gap-0 lg:grid-cols-[320px_1fr]"
      data-testid="practica-flujo-real"
    >
      <aside className="border-b bg-slate-950 p-5 text-white lg:border-b-0 lg:border-r sm:p-7">
        <div className="flex items-center justify-between text-xs font-black text-blue-200">
          <span>
            {es ? "PASO" : "STEP"} {pasoActual + 1}/{leccion.pasos.length}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">
            <LockKeyhole size={13} /> {es ? "MODO GUIADO" : "GUIDED MODE"}
          </span>
        </div>
        <div className="mt-5 space-y-2">
          {leccion.pasos.map((item, indice) => (
            <div
              key={localizar(item.accion, idioma)}
              className={`flex items-start gap-3 rounded-xl p-3 text-xs ${
                indice < pasoActual
                  ? "bg-emerald-500/15 text-emerald-200"
                  : indice === pasoActual
                    ? "bg-blue-600 text-white"
                    : "text-slate-500"
              }`}
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-current text-[10px] font-black">
                {indice < pasoActual ? <CheckCircle2 size={14} /> : indice + 1}
              </span>
              <span className="font-bold leading-5">
                {localizar(item.accion, idioma)}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
          <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300">
            {es ? "Haz únicamente esto" : "Do only this"}
          </p>
          <p className="mt-2 text-sm font-bold leading-6">
            {localizar(paso.instruccion, idioma)}
          </p>
          <p className="mt-3 text-xs leading-5 text-slate-300">
            {es
              ? "Los demás controles permanecen bloqueados hasta completar este paso."
              : "All other controls remain locked until this step is complete."}
          </p>
        </div>
      </aside>

      <section className="bg-slate-100 p-3 dark:bg-slate-900 sm:p-6">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-slate-950">
          <header className="flex flex-col gap-3 border-b bg-slate-50 p-5 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-blue-600">
                Vektra · {leccion.pantalla}
              </p>
              <h3 className="mt-1 text-xl font-black">{perfil.titulo}</h3>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              <ShieldCheck size={14} />
              {es ? "GUARDADO LOCAL · SIN API" : "LOCAL ONLY · NO API"}
            </span>
          </header>

          <div className="grid gap-5 p-5 sm:p-7 xl:grid-cols-[1fr_280px]">
            <div>
              <div className="mb-5 flex items-center justify-between rounded-xl border p-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    {es ? "Registro de práctica" : "Practice record"}
                  </span>
                  <strong className="mt-1 block text-sm">
                    {perfil.registro}
                  </strong>
                </div>
                <button className="boton-secundario" disabled>
                  {es ? "Otra acción bloqueada" : "Other action locked"}
                  <LockKeyhole size={15} />
                </button>
              </div>

              <div className="rounded-2xl border-2 border-blue-500 bg-blue-50/50 p-5 ring-4 ring-blue-100 dark:bg-blue-950/20 dark:ring-blue-950">
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-600 text-white">
                    {control === "BUSQUEDA" ? (
                      <Search size={18} />
                    ) : control === "ARCHIVO" ? (
                      <Upload size={18} />
                    ) : (
                      <CheckCircle2 size={18} />
                    )}
                  </span>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-300">
                      {es ? "Control habilitado ahora" : "Enabled control"}
                    </p>
                    <h4 className="mt-1 font-black">{accion}</h4>
                  </div>
                </div>

                {control === "BUSQUEDA" && (
                  <label className="mt-5 block">
                    <span className="etiqueta">{perfil.campoPrimario}</span>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        className="campo flex-1"
                        value={captura.primario}
                        placeholder={perfil.ejemploPrimario}
                        onChange={(evento) =>
                          actualizar({ primario: evento.target.value })
                        }
                        data-testid="campo-practica-principal"
                        autoFocus
                      />
                      <button
                        type="button"
                        className="boton-primario"
                        onClick={ejecutarPaso}
                        disabled={!puedeEjecutar || ejecutado}
                        data-testid="control-guiado"
                      >
                        <Search size={17} /> {accion}
                      </button>
                    </div>
                  </label>
                )}

                {control === "CAPTURA" && (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <label>
                      <span className="etiqueta">{perfil.campoPrimario}</span>
                      <input
                        className="campo"
                        value={captura.primario}
                        placeholder={perfil.ejemploPrimario}
                        onChange={(evento) =>
                          actualizar({ primario: evento.target.value })
                        }
                        data-testid="campo-practica-principal"
                        autoFocus
                      />
                    </label>
                    <label>
                      <span className="etiqueta">{perfil.campoSecundario}</span>
                      <input
                        className="campo"
                        value={captura.secundario}
                        placeholder={perfil.ejemploSecundario}
                        onChange={(evento) =>
                          actualizar({ secundario: evento.target.value })
                        }
                        data-testid="campo-practica-secundario"
                      />
                    </label>
                    <div className="sm:col-span-2 flex justify-end">
                      <button
                        type="button"
                        className="boton-primario"
                        onClick={ejecutarPaso}
                        disabled={!puedeEjecutar || ejecutado}
                        data-testid="control-guiado"
                      >
                        {accion}
                      </button>
                    </div>
                  </div>
                )}

                {control === "ARCHIVO" && (
                  <div className="mt-5">
                    {esDescarga ? (
                      <div className="rounded-xl border border-blue-200 bg-white p-5 text-center dark:bg-slate-950">
                        <Download className="mx-auto text-blue-600" size={30} />
                        <strong className="mt-2 block text-sm">
                          {es
                            ? "Se descargará una plantilla CSV real en tu equipo"
                            : "A real CSV template will be downloaded"}
                        </strong>
                        <span className="mt-1 block text-xs text-slate-500">
                          {es
                            ? "La descarga es local y no consulta ni modifica la base de datos."
                            : "The download stays local and does not read or change the database."}
                        </span>
                      </div>
                    ) : (
                      <label className="block rounded-xl border border-dashed border-blue-400 bg-white p-5 text-center dark:bg-slate-950">
                        <FileSpreadsheet
                          className="mx-auto text-blue-600"
                          size={30}
                        />
                        <span className="mt-2 block text-sm font-bold">
                          {es
                            ? "Selecciona un archivo de práctica"
                            : "Choose a practice file"}
                        </span>
                        <input
                          className="mt-3 block w-full text-xs"
                          type="file"
                          onChange={(evento) =>
                            actualizar({
                              archivo: evento.target.files?.[0]?.name ?? "",
                            })
                          }
                          data-testid="archivo-practica"
                        />
                      </label>
                    )}
                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        className="boton-primario"
                        onClick={ejecutarPaso}
                        disabled={!puedeEjecutar || ejecutado}
                        data-testid="control-guiado"
                      >
                        {esDescarga ? (
                          <Download size={17} />
                        ) : (
                          <Upload size={17} />
                        )}{" "}
                        {accion}
                      </button>
                    </div>
                  </div>
                )}

                {control === "VERIFICACION" && (
                  <div className="mt-5">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {perfil.resumen.map(([etiqueta, valor]) => (
                        <div
                          key={etiqueta}
                          className="rounded-xl bg-white p-3 dark:bg-slate-950"
                        >
                          <span className="text-[10px] font-black uppercase text-slate-500">
                            {etiqueta}
                          </span>
                          <strong className="mt-1 block text-sm">
                            {valor}
                          </strong>
                        </div>
                      ))}
                    </div>
                    <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-white p-4 text-sm dark:bg-slate-950">
                      <input
                        className="mt-1"
                        type="checkbox"
                        checked={captura.verificado}
                        onChange={(evento) =>
                          actualizar({ verificado: evento.target.checked })
                        }
                        data-testid="confirmacion-practica"
                      />
                      <span>
                        <strong className="block">
                          {es
                            ? "Ya verifiqué los datos mostrados"
                            : "I verified the displayed data"}
                        </strong>
                        <span className="mt-1 block text-xs text-slate-500">
                          {localizar(paso.instruccion, idioma)}
                        </span>
                      </span>
                    </label>
                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        className="boton-primario"
                        onClick={ejecutarPaso}
                        disabled={!puedeEjecutar || ejecutado}
                        data-testid="control-guiado"
                      >
                        {accion}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {ejecutado && (
                <div
                  className="mt-4 flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100"
                  data-testid="accion-guiada-completada"
                  role="status"
                >
                  <CheckCircle2 className="mt-0.5 shrink-0" size={20} />
                  <div>
                    <strong className="block">
                      {es
                        ? "Paso ejecutado y guardado localmente"
                        : "Step completed and saved locally"}
                    </strong>
                    {localizar(paso.explicacion, idioma)}
                  </div>
                </div>
              )}
            </div>

            <aside className="h-fit rounded-2xl bg-slate-950 p-4 text-white">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {es ? "Resumen de la pantalla" : "Screen summary"}
              </p>
              <div className="mt-4 space-y-3">
                {perfil.resumen.map(([etiqueta, valor]) => (
                  <div
                    key={etiqueta}
                    className="flex justify-between gap-3 text-xs"
                  >
                    <span className="text-slate-400">{etiqueta}</span>
                    <strong className="text-right">{valor}</strong>
                  </div>
                ))}
              </div>
              <div className="mt-5 border-t border-white/10 pt-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {es ? "Acciones bloqueadas" : "Locked actions"}
                </p>
                <button
                  className="mt-3 w-full rounded-lg border border-white/10 p-2 text-xs text-slate-500"
                  disabled
                >
                  {es ? "Guardar en base de datos" : "Save to database"} ·{" "}
                  <LockKeyhole className="inline" size={13} />
                </button>
                <button
                  className="mt-2 w-full rounded-lg border border-white/10 p-2 text-xs text-slate-500"
                  disabled
                >
                  {es ? "Navegar a otro módulo" : "Open another module"} ·{" "}
                  <LockKeyhole className="inline" size={13} />
                </button>
              </div>
            </aside>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            className="boton-primario"
            disabled={!ejecutado}
            onClick={continuar}
            data-testid="continuar-paso-practica"
          >
            {pasoActual === leccion.pasos.length - 1
              ? es
                ? "Terminar práctica"
                : "Finish practice"
              : es
                ? "Continuar al siguiente paso"
                : "Continue to next step"}
            <ChevronRight size={18} />
          </button>
        </div>
      </section>
    </div>
  );
}
