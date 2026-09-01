"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CheckCircle2,
  FileSignature,
  RefreshCw,
  WalletCards,
} from "lucide-react";
import { api, ErrorApi } from "@/lib/api";
import { usarDatosVivos } from "@/lib/usarDatosVivos";
import type { Pagina } from "@/lib/tipos";
import {
  EncabezadoPagina,
  EstadoVacio,
  MensajeError,
  Modal,
  Paginador,
} from "@/componentes/ui";
import { usarAplicacion } from "@/componentes/proveedores";

interface Operador {
  id: string;
  nombre: string;
  rol: string;
}
interface Calculo {
  fecha: string;
  operador: Operador;
  cerrado: { folio: string } | null;
  sistema: {
    efectivo: number;
    transferencia: number;
    tarjeta: number;
    otro: number;
    total: number;
  };
  abonos: { cantidad: number; total: number };
  ventasContado: { cantidad: number; total: number };
  entregas: { cantidad: number };
  reembolsos: { cantidad: number; total: number };
}
interface Corte {
  id: string;
  folio: string;
  fechaOperativa: string;
  diferencia: string;
  efectivoSistema: string;
  transferenciaSistema: string;
  tarjetaSistema: string;
  otroSistema: string;
  efectivoDeclarado: string;
  transferenciaDeclarada: string;
  tarjetaDeclarada: string;
  otroDeclarado: string;
  cantidadAbonos: number;
  cantidadVentasContado: number;
  cantidadEntregas: number;
  totalReembolsos: string;
  firmaNombre: string;
  hashIntegridad: string;
  cerradoEn: string;
  usuarioOperador: { nombre: string };
  cerradoPor: { nombre: string };
}

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export default function PaginaCortes() {
  const { idioma, usuario } = usarAplicacion();
  const es = idioma === "es";
  const [operadores, establecerOperadores] = useState<Operador[]>([]);
  const [operadorId, establecerOperadorId] = useState("");
  const [fecha, establecerFecha] = useState(() =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Mexico_City",
    }).format(new Date()),
  );
  const [calculo, establecerCalculo] = useState<Calculo | null>(null);
  const [cortes, establecerCortes] = useState<Pagina<Corte> | null>(null);
  const [pagina, establecerPagina] = useState(1);
  const [modal, establecerModal] = useState(false);
  const [error, establecerError] = useState("");
  const [errorOperacion, establecerErrorOperacion] = useState("");
  const [guardando, establecerGuardando] = useState(false);
  const [resultado, establecerResultado] = useState<Corte | null>(null);
  const guardandoRef = useRef(false);

  const cargarHistorial = useCallback(() => {
    api<Pagina<Corte>>(`/cortes?pagina=${pagina}&limite=15`)
      .then(establecerCortes)
      .catch((e) => establecerError(e.message));
  }, [pagina]);
  useEffect(cargarHistorial, [cargarHistorial]);
  usarDatosVivos(cargarHistorial);
  useEffect(() => {
    api<{ datos: Operador[] }>("/cortes/operadores")
      .then((r) => {
        establecerOperadores(r.datos);
        establecerOperadorId(
          r.datos.find((o) => o.id === usuario?.id)?.id ?? r.datos[0]?.id ?? "",
        );
      })
      .catch((e) => establecerError(e.message));
  }, [usuario?.id]);

  const previsualizar = useCallback(async () => {
    if (!operadorId || !fecha) return;
    establecerError("");
    try {
      establecerCalculo(
        await api<Calculo>(
          `/cortes/previsualizar?usuarioOperadorId=${operadorId}&fecha=${fecha}`,
        ),
      );
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
    }
  }, [operadorId, fecha]);
  useEffect(() => {
    void previsualizar();
  }, [previsualizar]);
  usarDatosVivos(previsualizar, { intervaloMs: 15_000 });

  async function cerrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (guardandoRef.current) return;
    const formulario = new FormData(evento.currentTarget);
    guardandoRef.current = true;
    establecerGuardando(true);
    establecerErrorOperacion("");
    try {
      const corte = await api<Corte>("/cortes", {
        method: "POST",
        body: JSON.stringify({
          usuarioOperadorId: operadorId,
          fecha,
          efectivo: Number(formulario.get("efectivo") || 0),
          transferencia: Number(formulario.get("transferencia") || 0),
          tarjeta: Number(formulario.get("tarjeta") || 0),
          otro: Number(formulario.get("otro") || 0),
          firmaNombre: formulario.get("firmaNombre"),
          confirmacion: formulario.get("confirmacion"),
          notas: formulario.get("notas") || undefined,
        }),
      });
      establecerResultado(corte);
      void previsualizar();
      cargarHistorial();
    } catch (e) {
      establecerErrorOperacion(
        e instanceof ErrorApi
          ? e.message
          : es
            ? "No se pudo firmar el corte. Revise los datos e intente de nuevo."
            : "The closing could not be signed. Review the data and try again.",
      );
    } finally {
      guardandoRef.current = false;
      establecerGuardando(false);
    }
  }

  function abrirCierre() {
    establecerErrorOperacion("");
    establecerResultado(null);
    establecerModal(true);
  }

  function cerrarModal() {
    if (guardandoRef.current) return;
    establecerModal(false);
    establecerErrorOperacion("");
    establecerResultado(null);
  }

  const totalSistema = calculo?.sistema.total ?? 0;
  const etiquetaFecha = useMemo(
    () => fecha.split("-").reverse().join("/"),
    [fecha],
  );
  return (
    <>
      <EncabezadoPagina
        titulo={
          es ? "Corte de caja y liquidación" : "Cash closing and settlement"
        }
        descripcion={
          es
            ? "Cuadra abonos, ventas de contado, reembolsos y entregas por cada operador de caja."
            : "Reconcile collections, cash sales, refunds, and deliveries for each cash operator."
        }
        accion={
          <button
            className="boton-primario"
            disabled={!calculo || Boolean(calculo.cerrado)}
            onClick={abrirCierre}
            data-capacitacion="cortes.cierre.abrir"
          >
            <FileSignature size={18} /> Firmar cierre
          </button>
        }
      />
      {error && <MensajeError mensaje={error} />}
      <div
        className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
        data-capacitacion="cortes.sincronizacion-revisar"
      >
        {es
          ? "Antes de firmar, sincroniza los dispositivos del operador seleccionado. Una jornada cerrada queda sellada y ya no admite abonos, ventas, entregas ni devoluciones tardías de esa fecha."
          : "Before signing, sync the selected operator's devices. A closed day is sealed and no longer accepts late payments, sales, deliveries, or refunds for that date."}
      </div>
      <section className="panel mb-6 p-5" data-capacitacion="cortes.filtros">
        <div className="grid gap-4 md:grid-cols-[1fr_220px_auto]">
          <label>
            <span className="etiqueta">
              {es ? "Operador real de caja" : "Actual cash operator"}
            </span>
            <select
              className="campo"
              value={operadorId}
              onChange={(e) => establecerOperadorId(e.target.value)}
              data-capacitacion="cortes.operador"
            >
              {operadores.map((operador) => (
                <option key={operador.id} value={operador.id}>
                  {operador.nombre} · {operador.rol.toLocaleLowerCase("es-MX")}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="etiqueta">Fecha operativa</span>
            <input
              className="campo"
              type="date"
              value={fecha}
              onChange={(e) => establecerFecha(e.target.value)}
              data-capacitacion="cortes.fecha"
            />
          </label>
          <button
            className="boton-secundario self-end"
            onClick={() => void previsualizar()}
            data-capacitacion="cortes.recalcular"
          >
            <RefreshCw size={17} /> Recalcular
          </button>
        </div>
      </section>
      {calculo && (
        <>
          {calculo.cerrado && (
            <div
              className="mb-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
              data-capacitacion="cortes.estado-cerrado"
            >
              <CheckCircle2 /> Jornada cerrada con folio{" "}
              <strong>{calculo.cerrado.folio}</strong>
            </div>
          )}
          <section
            className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            data-capacitacion="cortes.metodos-revisar"
          >
            <Indicador
              etiqueta="Efectivo neto"
              valor={calculo.sistema.efectivo}
            />
            <Indicador
              etiqueta="Transferencias"
              valor={calculo.sistema.transferencia}
            />
            <Indicador etiqueta="Tarjeta" valor={calculo.sistema.tarjeta} />
            <Indicador etiqueta="Otros" valor={calculo.sistema.otro} />
          </section>
          <section
            className="panel mb-6 grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-5"
            data-capacitacion="cortes.resumen-revisar"
          >
            <Dato
              etiqueta="Total esperado"
              valor={dinero.format(totalSistema)}
              destacado
            />
            <Dato
              etiqueta="Abonos"
              valor={`${calculo.abonos.cantidad} · ${dinero.format(calculo.abonos.total)}`}
            />
            <Dato
              etiqueta="Ventas contado"
              valor={`${calculo.ventasContado.cantidad} · ${dinero.format(calculo.ventasContado.total)}`}
            />
            <Dato
              etiqueta="Entregas"
              valor={String(calculo.entregas.cantidad)}
            />
            <Dato
              etiqueta="Reembolsos"
              valor={`${calculo.reembolsos.cantidad} · ${dinero.format(calculo.reembolsos.total)}`}
            />
          </section>
        </>
      )}
      <section
        className="panel overflow-hidden"
        data-capacitacion="cortes.historial"
      >
        <div className="border-b p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <WalletCards size={18} /> Historial de cierres
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950">
              <tr>
                <th className="px-4 py-3">Folio / fecha</th>
                <th>Operador</th>
                <th>Abonos</th>
                <th>Ventas</th>
                <th>Entregas</th>
                <th>Diferencia</th>
                <th>Firma</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {cortes?.datos.map((corte) => (
                <tr key={corte.id}>
                  <td className="px-4 py-3">
                    <strong>{corte.folio}</strong>
                    <p className="text-xs text-slate-500">
                      {new Date(corte.fechaOperativa).toLocaleDateString(
                        "es-MX",
                        { timeZone: "UTC" },
                      )}
                    </p>
                  </td>
                  <td>{corte.usuarioOperador.nombre}</td>
                  <td>{corte.cantidadAbonos}</td>
                  <td>{corte.cantidadVentasContado}</td>
                  <td>{corte.cantidadEntregas}</td>
                  <td
                    className={
                      Number(corte.diferencia) === 0
                        ? "font-semibold text-emerald-600"
                        : "font-semibold text-red-600"
                    }
                  >
                    {dinero.format(Number(corte.diferencia))}
                  </td>
                  <td>
                    <strong>{corte.firmaNombre}</strong>
                    <p
                      className="max-w-32 truncate font-mono text-[10px] text-slate-400"
                      title={corte.hashIntegridad}
                    >
                      {corte.hashIntegridad}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {cortes?.datos.length === 0 && (
          <EstadoVacio texto="Aún no hay cortes firmados." />
        )}
        {cortes && (
          <Paginador
            pagina={cortes.paginacion.pagina}
            totalPaginas={cortes.paginacion.totalPaginas}
            cambiar={establecerPagina}
          />
        )}
      </section>
      <Modal
        abierto={modal}
        cerrar={cerrarModal}
        titulo={
          resultado
            ? es
              ? "Corte registrado"
              : "Closing recorded"
            : `${es ? "Cerrar jornada" : "Close business day"} · ${etiquetaFecha}`
        }
        bloqueado={guardando}
      >
        {resultado ? (
          <div className="space-y-5" aria-live="polite">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
              <CheckCircle2 className="mb-3" size={34} aria-hidden="true" />
              <p className="font-semibold">
                {es
                  ? "La jornada quedó cerrada y firmada."
                  : "The business day was closed and signed."}
              </p>
              <p className="mt-3 text-xs uppercase tracking-wide opacity-75">
                {es ? "Folio del corte" : "Closing reference"}
              </p>
              <p
                className="mt-1 break-all font-mono text-xl font-bold"
                data-testid="folio-corte-confirmado"
              >
                {resultado.folio}
              </p>
              <p className="mt-3 text-sm">
                {es ? "Diferencia registrada:" : "Recorded difference:"}{" "}
                <strong>{dinero.format(Number(resultado.diferencia))}</strong>
              </p>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                className="boton-primario"
                onClick={cerrarModal}
              >
                {es ? "Listo" : "Done"}
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={cerrar}
            data-capacitacion="cortes.cierre.formulario"
            aria-busy={guardando || undefined}
          >
            <fieldset disabled={guardando} className="space-y-5">
              <legend className="sr-only">Datos del corte de caja</legend>
              {errorOperacion && <MensajeError mensaje={errorOperacion} />}
              <p
                className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-100"
                data-capacitacion="cortes.cierre.esperado-revisar"
              >
                El sistema espera <strong>{dinero.format(totalSistema)}</strong>
                {". "}Capture lo realmente recibido por cada método; la
                diferencia se conservará en el cierre.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {["efectivo", "transferencia", "tarjeta", "otro"].map(
                  (metodo) => (
                    <label key={metodo}>
                      <span className="etiqueta capitalize">
                        {metodo} declarado
                      </span>
                      <input
                        name={metodo}
                        className="campo"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue="0"
                        required
                        data-capacitacion={`cortes.cierre.declarado.${metodo}`}
                      />
                    </label>
                  ),
                )}
              </div>
              <label>
                <span className="etiqueta">Nombre completo de quien firma</span>
                <input
                  name="firmaNombre"
                  className="campo"
                  minLength={3}
                  required
                  data-capacitacion="cortes.cierre.firma"
                />
              </label>
              <label>
                <span className="etiqueta">Confirmación exacta</span>
                <input
                  name="confirmacion"
                  className="campo font-mono"
                  placeholder={`CERRAR ${fecha}`}
                  pattern={`CERRAR ${fecha}`}
                  required
                  data-capacitacion="cortes.cierre.confirmacion"
                />
              </label>
              <label>
                <span className="etiqueta">
                  Notas o explicación de diferencias
                </span>
                <textarea
                  name="notas"
                  className="campo min-h-20 py-3"
                  data-capacitacion="cortes.cierre.notas"
                />
              </label>
              <p className="sr-only" aria-live="assertive">
                {guardando
                  ? es
                    ? "Firmando el corte. No cierre esta ventana."
                    : "Signing the closing. Do not close this window."
                  : ""}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="boton-secundario"
                  onClick={cerrarModal}
                >
                  {es ? "Cancelar" : "Cancel"}
                </button>
                <button
                  className="boton-primario"
                  data-capacitacion="cortes.cierre.guardar"
                >
                  {guardando ? (
                    <>
                      <RefreshCw className="animate-spin" size={17} />
                      {es ? "Firmando cierre…" : "Signing…"}
                    </>
                  ) : (
                    <>
                      <FileSignature size={17} />
                      {es ? "Firmar y cerrar" : "Sign and close"}
                    </>
                  )}
                </button>
              </div>
            </fieldset>
          </form>
        )}
      </Modal>
    </>
  );
}

function Indicador({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div className="panel p-5">
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {etiqueta}
      </p>
      <p className="mt-2 text-xl font-semibold">{dinero.format(valor)}</p>
    </div>
  );
}
function Dato({
  etiqueta,
  valor,
  destacado = false,
}: {
  etiqueta: string;
  valor: string;
  destacado?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {etiqueta}
      </p>
      <p
        className={`mt-1 font-semibold ${destacado ? "text-lg text-blue-600" : ""}`}
      >
        {valor}
      </p>
    </div>
  );
}
