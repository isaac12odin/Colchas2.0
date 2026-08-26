"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CircleDollarSign,
  ClipboardList,
  Edit3,
  ReceiptText,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { api, ErrorApi } from "@/lib/api";
import { usarAplicacion } from "@/componentes/proveedores";
import { EncabezadoPagina, MensajeError } from "@/componentes/ui";
import { usarDatosVivos } from "@/lib/usarDatosVivos";
import { usarAccionInicial } from "@/lib/usarAccionInicial";
import { ModalesExpedienteCliente } from "@/modulos/clientes/ModalesExpedienteCliente";
import type {
  ClienteDetalle,
  Localidad,
} from "@/modulos/clientes/tiposExpediente";
import { ResumenCarteraCliente } from "@/modulos/clientes/ResumenCarteraCliente";
import { TablaVencimientosCliente } from "@/modulos/clientes/TablaVencimientosCliente";

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

const clasesEstado: Record<string, string> = {
  PAGADA: "bg-emerald-100 text-emerald-700",
  PARCIAL: "bg-amber-100 text-amber-800",
  VENCIDA: "bg-red-100 text-red-700",
  PENDIENTE: "bg-slate-100 text-slate-700",
  CANCELADA: "bg-red-100 text-red-700",
  CONFIRMADA: "bg-emerald-100 text-emerald-700",
};

export default function ExpedienteCliente() {
  const { id } = useParams<{ id: string }>();
  const { idioma, usuario } = usarAplicacion();
  const es = idioma === "es";
  const [cliente, establecerCliente] = useState<ClienteDetalle | null>(null);
  const [localidades, establecerLocalidades] = useState<Localidad[]>([]);
  const [editar, establecerEditar] = useState(false);
  const [ajustarSaldo, establecerAjustarSaldo] = useState(false);
  const [abonoAnular, establecerAbonoAnular] = useState<
    ClienteDetalle["abonos"][number] | null
  >(null);
  const [error, establecerError] = useState("");
  const [mensaje, establecerMensaje] = useState("");
  const puedeEditarDatos =
    usuario?.rol === "ADMINISTRADOR" ||
    usuario?.rol === "CONTABLE" ||
    usuario?.rol === "VENDEDOR";
  const puedeGestionarFinanzas =
    usuario?.rol === "ADMINISTRADOR" || usuario?.rol === "CONTABLE";

  const cargar = useCallback(() => {
    establecerError("");
    api<ClienteDetalle>(`/clientes/${id}`)
      .then(establecerCliente)
      .catch((e) => establecerError(e.message));
  }, [id]);
  useEffect(cargar, [cargar]);
  usarDatosVivos(cargar);
  useEffect(() => {
    api<{ datos: Localidad[] }>("/localidades")
      .then((respuesta) => establecerLocalidades(respuesta.datos))
      .catch(() => undefined);
  }, []);

  async function guardarCliente(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = new FormData(evento.currentTarget);
    const numeroTarjeta = formulario.get("numeroTarjeta");
    try {
      await api(`/clientes/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          nombreCompleto: formulario.get("nombreCompleto"),
          telefono: formulario.get("telefono"),
          direccion: formulario.get("direccion"),
          localidadId: formulario.get("localidadId"),
          notas: formulario.get("notas") || undefined,
          ...(numeroTarjeta !== null
            ? { numeroTarjeta: String(numeroTarjeta).trim() || null }
            : {}),
          ...(puedeGestionarFinanzas
            ? {
                limiteCredito: Number(formulario.get("limiteCredito") || 0),
              }
            : {}),
        }),
      });
      establecerEditar(false);
      cargar();
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
    }
  }

  async function guardarAjusteSaldo(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!cliente?.saldo) return;
    const formulario = new FormData(evento.currentTarget);
    establecerError("");
    try {
      const respuesta = await api<{
        saldoAnterior: number;
        saldoNuevo: number;
      }>(`/clientes/${id}/saldo`, {
        method: "PATCH",
        body: JSON.stringify({
          saldoActualEsperado: Number(cliente.saldo.saldoActual),
          nuevoSaldo: Number(formulario.get("nuevoSaldo")),
          motivo: formulario.get("motivo"),
          contrasenaActual: formulario.get("contrasenaActual"),
        }),
      });
      establecerAjustarSaldo(false);
      establecerMensaje(
        `${es ? "Ajuste registrado" : "Adjustment recorded"}: ${dinero.format(respuesta.saldoAnterior)} → ${dinero.format(respuesta.saldoNuevo)}`,
      );
      await cargar();
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
    }
  }

  async function anular(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!abonoAnular) return;
    const formulario = new FormData(evento.currentTarget);
    try {
      await api(`/abonos/${abonoAnular.id}/anular`, {
        method: "POST",
        body: JSON.stringify({ motivo: formulario.get("motivo") }),
      });
      establecerAbonoAnular(null);
      cargar();
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
    }
  }

  const riesgo = cliente?.evaluacionesRiesgo[0];
  usarAccionInicial((accion) => {
    if (accion === "editar" && puedeEditarDatos) establecerEditar(true);
    if (accion === "saldo" && puedeGestionarFinanzas)
      establecerAjustarSaldo(true);
  }, Boolean(cliente));

  return (
    <>
      <Link
        href="/clientes"
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600"
        data-capacitacion="clientes.expediente.volver"
      >
        <ArrowLeft size={17} /> {es ? "Volver a clientes" : "Back to customers"}
      </Link>
      <EncabezadoPagina
        titulo={
          cliente?.nombreCompleto ??
          (es ? "Expediente del cliente" : "Customer account")
        }
        descripcion={
          cliente
            ? `${cliente.telefono} · ${cliente.localidad.nombre}, ${cliente.localidad.estado}`
            : es
              ? "Saldo, pagos, ventas, pedidos y riesgo en un solo lugar."
              : "Balance, payments, sales, orders, and risk in one place."
        }
        accion={
          puedeEditarDatos && cliente ? (
            <div className="flex flex-wrap gap-2">
              {puedeGestionarFinanzas && (
                <button
                  className="boton-secundario"
                  onClick={() => establecerAjustarSaldo(true)}
                  data-capacitacion="clientes.saldo.ajustar-abrir"
                >
                  <SlidersHorizontal size={17} />
                  {es ? "Ajustar saldo" : "Adjust balance"}
                </button>
              )}
              <button
                className="boton-primario"
                onClick={() => establecerEditar(true)}
                data-capacitacion="clientes.edicion.abrir"
              >
                <Edit3 size={17} /> {es ? "Editar cliente" : "Edit customer"}
              </button>
            </div>
          ) : undefined
        }
      />
      {error && <MensajeError mensaje={error} />}
      {mensaje && (
        <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          {mensaje}
        </div>
      )}
      {!cliente ? (
        <div className="panel p-10 text-center text-sm text-slate-500">
          Cargando…
        </div>
      ) : (
        <div className="space-y-6">
          <ResumenCarteraCliente cliente={cliente} es={es} />

          <section
            className="panel p-5 sm:p-6"
            data-capacitacion="clientes.expediente.datos"
          >
            <div className="grid gap-4 text-sm md:grid-cols-4">
              <Dato
                etiqueta="Tarjeta"
                valor={cliente.numeroTarjeta ?? "Sin tarjeta"}
              />
              <Dato etiqueta="Teléfono" valor={cliente.telefono} />
              <Dato etiqueta="Dirección" valor={cliente.direccion} />
              <Dato
                etiqueta="Límite de crédito"
                valor={dinero.format(Number(cliente.limiteCredito))}
              />
            </div>
            {riesgo && (
              <div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-950">
                <strong>{riesgo.razon}</strong>
                <p className="mt-1 text-slate-500">
                  {riesgo.cuotasVencidas} cuotas vencidas ·{" "}
                  {riesgo.diasMoraMaximos} días máximos de mora ·{" "}
                  {riesgo.porcentajePagado}% pagado
                </p>
              </div>
            )}
          </section>

          <section
            className="panel overflow-hidden"
            data-capacitacion="clientes.expediente.movimientos"
          >
            <TituloSeccion
              icono={<SlidersHorizontal />}
              titulo={es ? "Movimientos del saldo" : "Balance movements"}
              detalle={`${cliente.movimientosSaldo.length} ${es ? "movimientos" : "movements"}`}
            />
            <div className="divide-y">
              {cliente.movimientosSaldo.slice(0, 12).map((movimiento) => (
                <div
                  key={movimiento.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm"
                >
                  <div>
                    <strong>{movimiento.concepto}</strong>
                    <p className="text-xs text-slate-500">
                      {new Date(movimiento.creadoEn).toLocaleString("es-MX")} ·{" "}
                      {movimiento.tipo}
                    </p>
                  </div>
                  <div className="text-right">
                    <strong>{dinero.format(Number(movimiento.monto))}</strong>
                    <p className="text-xs text-slate-500">
                      {dinero.format(Number(movimiento.saldoAnterior))} →{" "}
                      {dinero.format(Number(movimiento.saldoNuevo))}
                    </p>
                  </div>
                </div>
              ))}
              {cliente.movimientosSaldo.length === 0 && (
                <p className="p-6 text-center text-sm text-slate-500">
                  {es ? "Aún no hay movimientos." : "No movements yet."}
                </p>
              )}
            </div>
          </section>

          <TablaVencimientosCliente estado={cliente.estadoCuenta} es={es} />

          <section
            className="panel overflow-hidden"
            data-capacitacion="clientes.expediente.abonos"
          >
            <TituloSeccion
              icono={<ReceiptText />}
              titulo="Abonos"
              detalle={`${cliente.abonos.length} registros`}
            />
            <div className="divide-y">
              {cliente.abonos.map((abono) => (
                <div
                  key={abono.id}
                  className={`flex flex-wrap items-center justify-between gap-3 p-4 text-sm ${abono.anuladoEn ? "opacity-60" : ""}`}
                >
                  <div>
                    <strong>{dinero.format(Number(abono.monto))}</strong>
                    <p className="text-xs text-slate-500">
                      {new Date(abono.fechaAbono).toLocaleString("es-MX")} ·{" "}
                      {abono.metodo}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {abono.anuladoEn ? (
                      <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                        ANULADO · {abono.motivoAnulacion}
                      </span>
                    ) : puedeGestionarFinanzas ? (
                      <button
                        className="boton-secundario text-red-600"
                        onClick={() => establecerAbonoAnular(abono)}
                        data-capacitacion="clientes.abono.anular-abrir"
                      >
                        Anular
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div
              className="panel overflow-hidden"
              data-capacitacion="clientes.expediente.ventas"
            >
              <TituloSeccion
                icono={<CircleDollarSign />}
                titulo="Ventas"
                detalle={`${cliente.ventas.length} ventas`}
              />
              <div className="divide-y">
                {cliente.ventas.map((venta) => (
                  <article key={venta.id} className="p-4">
                    <div className="flex justify-between gap-3">
                      <div>
                        <strong>{venta.folio}</strong>
                        <p className="text-xs text-slate-500">
                          {new Date(venta.fechaVenta).toLocaleDateString(
                            "es-MX",
                          )}{" "}
                          · {venta.tipo}
                        </p>
                      </div>
                      <div className="text-right">
                        <strong>{dinero.format(Number(venta.total))}</strong>
                        <p>
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-semibold ${clasesEstado[venta.estado] ?? "bg-slate-100"}`}
                          >
                            {venta.estado}
                          </span>
                        </p>
                      </div>
                    </div>
                    <ul className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                      {venta.detalles.map((detalle) => (
                        <li key={detalle.productoSku}>
                          {detalle.cantidad} × {detalle.productoNombre} ·{" "}
                          {dinero.format(Number(detalle.total))}
                        </li>
                      ))}
                    </ul>
                    {puedeGestionarFinanzas &&
                      venta.estado === "CONFIRMADA" && (
                        <Link
                          href={`/devoluciones?ventaId=${venta.id}`}
                          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600"
                          data-capacitacion="clientes.expediente.devolucion-abrir"
                        >
                          <RotateCcw size={14} /> Devolución o cancelación
                        </Link>
                      )}
                  </article>
                ))}
              </div>
            </div>
            <div
              className="panel overflow-hidden"
              data-capacitacion="clientes.expediente.pedidos"
            >
              <TituloSeccion
                icono={<ClipboardList />}
                titulo="Pedidos"
                detalle={`${cliente.pedidos.length} pedidos`}
              />
              <div className="divide-y">
                {cliente.pedidos.map((pedido) => (
                  <article key={pedido.id} className="p-4 text-sm">
                    <div className="flex justify-between">
                      <strong>{pedido.folio}</strong>
                      <span className="text-xs font-semibold">
                        {pedido.estado}
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1 text-xs text-slate-500">
                      {pedido.items.map((item, indice) => (
                        <li key={indice}>
                          {item.cantidad} × {item.descripcion} ·{" "}
                          {item.proveedor?.nombre ?? "Proveedor por confirmar"}
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      <ModalesExpedienteCliente
        cliente={cliente}
        localidades={localidades}
        puedeGestionarFinanzas={puedeGestionarFinanzas}
        es={es}
        editar={editar}
        ajustarSaldo={ajustarSaldo}
        abonoAnular={abonoAnular}
        cerrarEdicion={() => establecerEditar(false)}
        cerrarAjuste={() => establecerAjustarSaldo(false)}
        cerrarAnulacion={() => establecerAbonoAnular(null)}
        guardarCliente={guardarCliente}
        guardarAjusteSaldo={guardarAjusteSaldo}
        anular={anular}
      />
    </>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {etiqueta}
      </p>
      <p className="mt-1 font-medium">{valor}</p>
    </div>
  );
}

function TituloSeccion({
  icono,
  titulo,
  detalle,
}: {
  icono: React.ReactNode;
  titulo: string;
  detalle: string;
}) {
  return (
    <div className="flex items-center justify-between border-b p-4">
      <h2 className="flex items-center gap-2 font-semibold text-slate-800 dark:text-white">
        {icono}
        {titulo}
      </h2>
      <span className="text-xs text-slate-500">{detalle}</span>
    </div>
  );
}
