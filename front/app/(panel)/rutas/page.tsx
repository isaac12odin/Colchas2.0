"use client";

import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { EncabezadoPagina, MensajeError } from "@/componentes/ui";
import { usarAplicacion } from "@/componentes/proveedores";
import { api, ErrorApi } from "@/lib/api";
import { usarDatosVivos } from "@/lib/usarDatosVivos";
import { AccionesDocumentoRuta } from "@/modulos/rutas/AccionesDocumentoRuta";
import { CrearRutaModal } from "@/modulos/rutas/CrearRutaModal";
import { EstadoOperacionRuta } from "@/modulos/rutas/EstadoOperacionRuta";
import { GuiaJornadaRuta } from "@/modulos/rutas/GuiaJornadaRuta";
import {
  ModalRegistrarVisita,
  type RegistroVisitaRuta,
} from "@/modulos/rutas/ModalRegistrarVisita";
import { SelectorOrigenCobranzaRuta } from "@/modulos/rutas/SelectorOrigenCobranzaRuta";
import type {
  ClienteJornadaWeb,
  JornadaWeb,
  RutaWeb,
} from "@/modulos/rutas/tipos";

const hoy = new Date().toISOString().slice(0, 10);

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
  const [error, establecerError] = useState("");
  const [configurandoRuta, establecerConfigurandoRuta] = useState<
    RutaWeb | null | undefined
  >(undefined);

  const cargarRutas = useCallback(
    () =>
      api<{ datos: RutaWeb[] }>("/rutas")
        .then((respuesta) => {
          establecerRutas(respuesta.datos);
          establecerRutaId((actual) => actual || respuesta.datos[0]?.id || "");
        })
        .catch((errorCarga) => establecerError(errorCarga.message)),
    [],
  );

  const cargarJornada = useCallback(() => {
    if (!rutaId) {
      establecerJornada(null);
      return;
    }
    return api<JornadaWeb>(
      `/rutas/${rutaId}/jornada?fecha=${new Date(`${fecha}T12:00:00`).toISOString()}`,
    )
      .then(establecerJornada)
      .catch((errorCarga) => establecerError(errorCarga.message));
  }, [fecha, rutaId]);

  useEffect(() => {
    void cargarRutas();
  }, [cargarRutas]);
  useEffect(() => {
    void cargarJornada();
  }, [cargarJornada]);
  usarDatosVivos(async () => {
    await cargarRutas();
    await cargarJornada();
  });

  async function registrar(datos: RegistroVisitaRuta) {
    if (!seleccion || !jornada) return;
    try {
      await api(`/rutas/${jornada.id}/visitas`, {
        method: "POST",
        body: JSON.stringify({
          clienteId: seleccion.id,
          fechaProgramada: new Date(`${fecha}T12:00:00`).toISOString(),
          fechaVisita: new Date().toISOString(),
          resultado: datos.resultado,
          motivoNoCobro: datos.motivoNoCobro,
          promesaPagoFecha: datos.promesaPagoFecha
            ? new Date(`${datos.promesaPagoFecha}T12:00:00`).toISOString()
            : undefined,
          promesaPagoMonto: datos.promesaPagoMonto,
          notas: datos.notas,
          abono:
            datos.monto && datos.monto > 0
              ? {
                  monto: datos.monto,
                  metodo: datos.metodo ?? "EFECTIVO",
                  fechaAbono: new Date().toISOString(),
                  referencia: datos.referencia,
                }
              : undefined,
        }),
      });
      establecerSeleccion(null);
      await cargarJornada();
    } catch (errorRegistro) {
      establecerError(
        errorRegistro instanceof ErrorApi ? errorRegistro.message : "Error",
      );
      throw errorRegistro;
    }
  }

  const rutaActual = rutas.find((ruta) => ruta.id === rutaId);

  return (
    <>
      <EncabezadoPagina
        titulo={t.rutas}
        descripcion={
          es
            ? "Ordena a quién visitar, cobra lo acordado y conserva cada atraso sin duplicar el dinero."
            : "Order each visit, collect the agreed amount, and track every delay without duplicating money."
        }
        accion={
          usuario?.rol === "ADMINISTRADOR" ? (
            <button
              className="boton-primario"
              onClick={() => establecerConfigurandoRuta(null)}
              data-capacitacion="rutas.configuracion.abrir-nueva"
            >
              <Plus size={18} />
              {es ? "Nueva ruta" : "New route"}
            </button>
          ) : undefined
        }
      />
      {error && <MensajeError mensaje={error} />}

      <section className="mb-5 rounded-2xl border bg-white p-4 dark:bg-slate-950">
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className="etiqueta">{es ? "Ruta" : "Route"}</span>
            <select
              className="campo"
              value={rutaId}
              onChange={(evento) => establecerRutaId(evento.target.value)}
              data-capacitacion="rutas.jornada.ruta"
            >
              <option value="">—</option>
              {rutas.map((ruta) => (
                <option key={ruta.id} value={ruta.id}>
                  {ruta.nombre} · {ruta.diaSemana} ·{" "}
                  {ruta.cobrador?.nombre ?? (es ? "SÓLO WEB" : "WEB ONLY")}
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
              onChange={(evento) => establecerFecha(evento.target.value)}
              data-capacitacion="rutas.jornada.fecha"
            />
          </label>
        </div>
        <EstadoOperacionRuta ruta={rutaActual} es={es} />
        {rutaId && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <AccionesDocumentoRuta rutaId={rutaId} fecha={fecha} es={es} />
            {usuario?.rol === "ADMINISTRADOR" && (
              <button
                className="boton-secundario"
                onClick={() => establecerConfigurandoRuta(rutaActual ?? null)}
                data-capacitacion="rutas.configuracion.abrir-existente"
              >
                {es
                  ? "Configurar clientes y orden"
                  : "Configure customers and order"}
              </button>
            )}
          </div>
        )}
      </section>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        {rutaId ? (
          <SelectorOrigenCobranzaRuta
            rutaId={rutaId}
            jornada={jornada}
            es={es}
            seleccionar={establecerSeleccion}
          />
        ) : (
          <section className="panel p-8 text-center text-sm text-slate-500">
            {es
              ? "Selecciona una ruta para iniciar la cobranza."
              : "Select a route to start collecting."}
          </section>
        )}
        <GuiaJornadaRuta es={es} />
      </div>

      <ModalRegistrarVisita
        key={seleccion?.id ?? "sin-seleccion"}
        cliente={seleccion}
        es={es}
        cancelar={t.cancelar}
        guardar={t.guardar}
        cerrar={() => establecerSeleccion(null)}
        registrar={registrar}
      />
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
