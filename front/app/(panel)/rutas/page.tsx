"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Banknote, CheckCircle2, MapPin, Navigation, Plus } from "lucide-react";
import { api, ErrorApi } from "@/lib/api";
import {
  EncabezadoPagina,
  EstadoVacio,
  MensajeError,
  Modal,
} from "@/componentes/ui";
import { usarAplicacion } from "@/componentes/proveedores";
import { BuscadorExtraordinarioWeb } from "@/modulos/rutas/BuscadorExtraordinarioWeb";
import { CrearRutaModal } from "@/modulos/rutas/CrearRutaModal";
import type {
  ClienteJornadaWeb,
  JornadaWeb,
  RutaWeb,
} from "@/modulos/rutas/tipos";
const hoy = new Date().toISOString().slice(0, 10);
const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export default function PaginaRutas() {
  const { t, idioma, usuario } = usarAplicacion();
  const es = idioma === "es";
  const [rutas, establecerRutas] = useState<RutaWeb[]>([]);
  const [rutaId, establecerRutaId] = useState("");
  const [fecha, establecerFecha] = useState(hoy);
  const [jornada, establecerJornada] = useState<JornadaWeb | null>(null);
  const [seleccion, establecerSeleccion] = useState<ClienteJornadaWeb | null>(
    null,
  );
  const [resultado, establecerResultado] = useState("PAGO");
  const [error, establecerError] = useState("");
  const [configurandoRuta, establecerConfigurandoRuta] = useState<
    RutaWeb | null | undefined
  >(undefined);
  const cargarRutas = useCallback(() => {
    api<{ datos: RutaWeb[] }>("/rutas")
      .then((respuesta) => {
        establecerRutas(respuesta.datos);
        establecerRutaId((actual) => actual || respuesta.datos[0]?.id || "");
      })
      .catch((e) => establecerError(e.message));
  }, []);
  useEffect(() => {
    cargarRutas();
  }, [cargarRutas]);
  useEffect(() => {
    if (rutaId)
      api<JornadaWeb>(
        `/rutas/${rutaId}/jornada?fecha=${new Date(`${fecha}T12:00:00`).toISOString()}`,
      )
        .then(establecerJornada)
        .catch((e) => establecerError(e.message));
  }, [rutaId, fecha]);
  async function registrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!seleccion || !jornada) return;
    const f = new FormData(evento.currentTarget);
    const monto = Number(f.get("monto") || 0);
    try {
      await api(`/rutas/${jornada.id}/visitas`, {
        method: "POST",
        body: JSON.stringify({
          clienteId: seleccion.id,
          fechaProgramada: new Date(`${fecha}T12:00:00`).toISOString(),
          fechaVisita: new Date().toISOString(),
          resultado,
          notas: f.get("notas") || undefined,
          abono:
            monto > 0
              ? {
                  monto,
                  metodo: "EFECTIVO",
                  fechaAbono: new Date().toISOString(),
                }
              : undefined,
        }),
      });
      establecerSeleccion(null);
      setTimeout(
        () =>
          api<JornadaWeb>(
            `/rutas/${rutaId}/jornada?fecha=${new Date(`${fecha}T12:00:00`).toISOString()}`,
          ).then(establecerJornada),
        100,
      );
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
    }
  }
  return (
    <>
      <EncabezadoPagina
        titulo={t.rutas}
        descripcion={
          es
            ? "Agenda de cobranza por localidad, con pagos, visitas y entregas."
            : "Collection schedule by location, including payments, visits, and deliveries."
        }
        accion={
          usuario?.rol === "ADMINISTRADOR" ? (
            <button
              className="boton-primario"
              onClick={() => establecerConfigurandoRuta(null)}
            >
              <Plus size={18} />
              {es ? "Nueva ruta" : "New route"}
            </button>
          ) : undefined
        }
      />
      {error && <MensajeError mensaje={error} />}
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <label>
          <span className="etiqueta">{es ? "Ruta" : "Route"}</span>
          <select
            className="campo"
            value={rutaId}
            onChange={(e) => establecerRutaId(e.target.value)}
          >
            <option value="">—</option>
            {rutas.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre} · {r.diaSemana}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="etiqueta">
            {es ? "Fecha de jornada" : "Route date"}
          </span>
          <input
            className="campo"
            type="date"
            value={fecha}
            onChange={(e) => establecerFecha(e.target.value)}
          />
        </label>
      </div>
      {usuario?.rol === "ADMINISTRADOR" && rutaId && (
        <button
          className="boton-secundario mb-4"
          onClick={() =>
            establecerConfigurandoRuta(
              rutas.find((ruta) => ruta.id === rutaId) ?? null,
            )
          }
        >
          {es
            ? "Configurar localidades de esta ruta"
            : "Configure route locations"}
        </button>
      )}
      {rutaId && (
        <BuscadorExtraordinarioWeb
          rutaId={rutaId}
          es={es}
          alSeleccionar={(cliente) => {
            establecerSeleccion(cliente);
            establecerResultado(
              Number(cliente.saldo?.saldoActual ?? 0) > 0 ? "PAGO" : "ENTREGA",
            );
          }}
        />
      )}
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="panel overflow-hidden">
          <div className="border-b p-4">
            <h2 className="font-semibold">
              {jornada?.nombre ??
                (es ? "Selecciona una ruta" : "Select a route")}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {jornada
                ? `${jornada.clientes.filter((c) => c.visita).length}/${jornada.clientes.length} ${es ? "visitas registradas" : "visits recorded"}`
                : ""}
            </p>
          </div>
          <div className="divide-y">
            {jornada?.clientes.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  establecerSeleccion(c);
                  establecerResultado(
                    Number(c.saldo?.saldoActual ?? 0) > 0 ? "PAGO" : "ENTREGA",
                  );
                }}
                className="grid w-full gap-3 p-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800 sm:grid-cols-[45px_1fr_auto] sm:items-center"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-sm font-semibold dark:bg-slate-800">
                  {c.orden}
                </span>
                <span>
                  <span className="flex items-center gap-2 font-semibold">
                    {c.nombreCompleto}
                    {c.fueraDeRuta && (
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                        {es ? "FUERA DE RUTA" : "EXTRA"}
                      </span>
                    )}
                    {c.visita && (
                      <CheckCircle2 size={16} className="text-emerald-600" />
                    )}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    <MapPin size={12} className="mr-1 inline" />
                    {c.direccion} · {c.telefono}
                  </span>
                  {c.pedidos.length > 0 && (
                    <span className="mt-1 block text-xs font-semibold text-violet-600">
                      {c.pedidos.length}{" "}
                      {es ? "entrega(s) pendiente(s)" : "pending delivery(ies)"}
                    </span>
                  )}
                </span>
                <span className="text-left sm:text-right">
                  <span className="block font-semibold">
                    {dinero.format(Number(c.saldo?.saldoActual ?? 0))}
                  </span>
                  <span className="text-xs text-slate-500">
                    {c.visita?.resultado ??
                      c.evaluacionesRiesgo[0]?.nivel ??
                      (es ? "Pendiente" : "Pending")}
                  </span>
                </span>
              </button>
            ))}
            {jornada?.clientes.length === 0 && (
              <EstadoVacio
                texto={
                  es
                    ? "La ruta no tiene clientes asignados."
                    : "This route has no assigned customers."
                }
              />
            )}
          </div>
        </div>
        <aside className="panel h-fit p-5">
          <Navigation className="text-marca-500" />
          <h2 className="mt-4 font-semibold">
            {es ? "Orden de la jornada" : "Route workflow"}
          </h2>
          <ol className="mt-3 space-y-3 text-sm text-slate-500">
            <li>
              1. {es ? "Selecciona cada cliente." : "Select each customer."}
            </li>
            <li>
              2.{" "}
              {es
                ? "Marca el resultado y el abono."
                : "Record the result and payment."}
            </li>
            <li>
              3.{" "}
              {es
                ? "Confirma entregas pendientes."
                : "Confirm pending deliveries."}
            </li>
          </ol>
          <p className="mt-5 rounded-lg bg-marca-50 p-3 text-xs leading-5 text-marca-900 dark:bg-marca-900/30 dark:text-blue-100">
            {es
              ? "La app móvil guarda estas acciones sin conexión y las sincroniza después."
              : "The mobile app stores these actions offline and syncs them later."}
          </p>
        </aside>
      </div>
      <Modal
        abierto={Boolean(seleccion)}
        cerrar={() => establecerSeleccion(null)}
        titulo={seleccion?.nombreCompleto ?? ""}
      >
        <form onSubmit={registrar} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-950">
              <span className="block text-xs text-slate-500">
                {es ? "Saldo" : "Balance"}
              </span>
              <strong>
                {dinero.format(Number(seleccion?.saldo?.saldoActual ?? 0))}
              </strong>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-950">
              <span className="block text-xs text-slate-500">
                {es ? "Entregas" : "Deliveries"}
              </span>
              <strong>{seleccion?.pedidos.length ?? 0}</strong>
            </div>
          </div>
          <label>
            <span className="etiqueta">{es ? "Resultado" : "Result"}</span>
            <select
              className="campo"
              value={resultado}
              onChange={(e) => establecerResultado(e.target.value)}
            >
              <option value="PAGO">{es ? "Pagó" : "Paid"}</option>
              <option value="NO_PAGO">{es ? "No pagó" : "Did not pay"}</option>
              <option value="AUSENTE">{es ? "Ausente" : "Absent"}</option>
              <option value="REPROGRAMADO">
                {es ? "Reprogramado" : "Rescheduled"}
              </option>
              <option value="ENTREGA">{es ? "Entrega" : "Delivery"}</option>
            </select>
          </label>
          {resultado === "PAGO" && (
            <label>
              <span className="etiqueta">
                {es ? "Monto recibido" : "Amount received"}
              </span>
              <input
                name="monto"
                className="campo"
                type="number"
                min="0.01"
                max={Number(seleccion?.saldo?.saldoActual ?? 0)}
                step="0.01"
                required
              />
            </label>
          )}
          <label>
            <span className="etiqueta">{es ? "Notas" : "Notes"}</span>
            <textarea name="notas" className="campo min-h-20 py-3" />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="boton-secundario"
              onClick={() => establecerSeleccion(null)}
            >
              {t.cancelar}
            </button>
            <button className="boton-primario">
              <Banknote size={17} />
              {t.guardar}
            </button>
          </div>
        </form>
      </Modal>
      <CrearRutaModal
        abierto={configurandoRuta !== undefined}
        es={es}
        cancelar={t.cancelar}
        guardar={t.guardar}
        ruta={configurandoRuta ?? undefined}
        alCerrar={() => establecerConfigurandoRuta(undefined)}
        alCrear={cargarRutas}
      />
    </>
  );
}
