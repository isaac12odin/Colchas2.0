"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  Edit3,
  ReceiptText,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { api, ErrorApi } from "@/lib/api";
import { usarAplicacion } from "@/componentes/proveedores";
import { EncabezadoPagina, MensajeError, Modal } from "@/componentes/ui";

interface ClienteDetalle {
  id: string;
  nombreCompleto: string;
  telefono: string;
  direccion: string;
  numeroTarjeta: string | null;
  limiteCredito: string;
  notas: string | null;
  localidad: { id: string; nombre: string; estado: string };
  saldo: {
    saldoActual: string;
    vencidoActual: string;
    totalCargos: string;
    totalAbonos: string;
  } | null;
  evaluacionesRiesgo: Array<{
    nivel: string;
    puntuacion: number;
    razon: string;
    cuotasVencidas: number;
    diasMoraMaximos: number;
    porcentajePagado: string;
  }>;
  ventas: Array<{
    id: string;
    folio: string;
    estado: string;
    tipo: string;
    total: string;
    anticipo: string;
    fechaVenta: string;
    detalles: Array<{
      productoNombre: string;
      productoSku: string;
      cantidad: number;
      precioUnitario: string;
      total: string;
    }>;
    planPago: {
      periodicidad: string;
      montoCuota: string;
      cuotas: Array<{
        id: string;
        numero: number;
        fechaVence: string;
        monto: string;
        montoPagado: string;
        estado: string;
      }>;
    } | null;
    devoluciones: Array<{
      id: string;
      folio: string;
      totalDevuelto: string;
    }>;
  }>;
  abonos: Array<{
    id: string;
    monto: string;
    metodo: string;
    fechaAbono: string;
    referencia: string | null;
    anuladoEn: string | null;
    motivoAnulacion: string | null;
    anuladoPor: { nombre: string } | null;
  }>;
  pedidos: Array<{
    id: string;
    folio: string;
    estado: string;
    fechaCompromiso: string | null;
    creadoEn: string;
    venta: { folio: string } | null;
    items: Array<{
      descripcion: string;
      cantidad: number;
      precioEstimado: string;
      proveedor: { nombre: string } | null;
    }>;
  }>;
}

interface Localidad {
  id: string;
  nombre: string;
  estado: string;
}

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
  const [abonoAnular, establecerAbonoAnular] = useState<ClienteDetalle["abonos"][number] | null>(null);
  const [error, establecerError] = useState("");

  const cargar = useCallback(() => {
    establecerError("");
    api<ClienteDetalle>(`/clientes/${id}`)
      .then(establecerCliente)
      .catch((e) => establecerError(e.message));
  }, [id]);
  useEffect(cargar, [cargar]);
  useEffect(() => {
    api<{ datos: Localidad[] }>("/localidades")
      .then((respuesta) => establecerLocalidades(respuesta.datos))
      .catch(() => undefined);
  }, []);

  const cuotas = useMemo(
    () =>
      (cliente?.ventas ?? [])
        .flatMap((venta) =>
          (venta.planPago?.cuotas ?? []).map((cuota) => ({ ...cuota, venta })),
        )
        .sort(
          (a, b) =>
            new Date(a.fechaVence).getTime() - new Date(b.fechaVence).getTime(),
        ),
    [cliente],
  );

  async function guardarCliente(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = new FormData(evento.currentTarget);
    try {
      await api(`/clientes/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          nombreCompleto: formulario.get("nombreCompleto"),
          telefono: formulario.get("telefono"),
          direccion: formulario.get("direccion"),
          localidadId: formulario.get("localidadId"),
          limiteCredito: Number(formulario.get("limiteCredito") || 0),
          notas: formulario.get("notas") || undefined,
        }),
      });
      establecerEditar(false);
      cargar();
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

  const puedeEditar =
    usuario?.rol === "ADMINISTRADOR" || usuario?.rol === "CONTABLE";
  const riesgo = cliente?.evaluacionesRiesgo[0];

  return (
    <>
      <Link href="/clientes" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
        <ArrowLeft size={17} /> {es ? "Volver a clientes" : "Back to customers"}
      </Link>
      <EncabezadoPagina
        titulo={cliente?.nombreCompleto ?? (es ? "Expediente del cliente" : "Customer account")}
        descripcion={
          cliente
            ? `${cliente.telefono} · ${cliente.localidad.nombre}, ${cliente.localidad.estado}`
            : es
              ? "Saldo, pagos, ventas, pedidos y riesgo en un solo lugar."
              : "Balance, payments, sales, orders, and risk in one place."
        }
        accion={
          puedeEditar && cliente ? (
            <button className="boton-secundario" onClick={() => establecerEditar(true)}>
              <Edit3 size={17} /> {es ? "Editar datos" : "Edit"}
            </button>
          ) : undefined
        }
      />
      {error && <MensajeError mensaje={error} />}
      {!cliente ? (
        <div className="panel p-10 text-center text-sm text-slate-500">Cargando…</div>
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Resumen icono={<CircleDollarSign />} etiqueta="Saldo actual" valor={dinero.format(Number(cliente.saldo?.saldoActual ?? 0))} />
            <Resumen icono={<CalendarDays />} etiqueta="Saldo vencido" valor={dinero.format(Number(cliente.saldo?.vencidoActual ?? 0))} rojo={Number(cliente.saldo?.vencidoActual ?? 0) > 0} />
            <Resumen icono={<ReceiptText />} etiqueta="Total abonado" valor={dinero.format(Number(cliente.saldo?.totalAbonos ?? 0))} />
            <Resumen icono={<ShieldAlert />} etiqueta="Riesgo" valor={riesgo ? `${riesgo.nivel} · ${riesgo.puntuacion}` : "Sin calcular"} rojo={riesgo?.nivel === "ALTO" || riesgo?.nivel === "CRITICO"} />
          </section>

          <section className="panel p-5 sm:p-6">
            <div className="grid gap-4 text-sm md:grid-cols-4">
              <Dato etiqueta="Tarjeta" valor={cliente.numeroTarjeta ?? "Sin tarjeta"} />
              <Dato etiqueta="Teléfono" valor={cliente.telefono} />
              <Dato etiqueta="Dirección" valor={cliente.direccion} />
              <Dato etiqueta="Límite de crédito" valor={dinero.format(Number(cliente.limiteCredito))} />
            </div>
            {riesgo && (
              <div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-950">
                <strong>{riesgo.razon}</strong>
                <p className="mt-1 text-slate-500">
                  {riesgo.cuotasVencidas} cuotas vencidas · {riesgo.diasMoraMaximos} días máximos de mora · {riesgo.porcentajePagado}% pagado
                </p>
              </div>
            )}
          </section>

          <section className="panel overflow-hidden">
            <TituloSeccion icono={<CalendarDays />} titulo="Calendario de pagos" detalle={`${cuotas.length} cuotas`} />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950">
                  <tr><th className="px-4 py-3">Vencimiento</th><th>Venta</th><th>Cuota</th><th>Monto</th><th>Pagado</th><th>Estado</th></tr>
                </thead>
                <tbody className="divide-y">
                  {cuotas.map((cuota) => (
                    <tr key={cuota.id}>
                      <td className="px-4 py-3">{new Date(cuota.fechaVence).toLocaleDateString("es-MX")}</td>
                      <td>{cuota.venta.folio}</td><td>#{cuota.numero}</td>
                      <td>{dinero.format(Number(cuota.monto))}</td><td>{dinero.format(Number(cuota.montoPagado))}</td>
                      <td><span className={`rounded-full px-2 py-1 text-xs font-semibold ${clasesEstado[cuota.estado] ?? clasesEstado.PENDIENTE}`}>{cuota.estado}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel overflow-hidden">
            <TituloSeccion icono={<ReceiptText />} titulo="Abonos" detalle={`${cliente.abonos.length} registros`} />
            <div className="divide-y">
              {cliente.abonos.map((abono) => (
                <div key={abono.id} className={`flex flex-wrap items-center justify-between gap-3 p-4 text-sm ${abono.anuladoEn ? "opacity-60" : ""}`}>
                  <div><strong>{dinero.format(Number(abono.monto))}</strong><p className="text-xs text-slate-500">{new Date(abono.fechaAbono).toLocaleString("es-MX")} · {abono.metodo}</p></div>
                  <div className="flex items-center gap-2">
                    {abono.anuladoEn ? <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">ANULADO · {abono.motivoAnulacion}</span> : puedeEditar ? <button className="boton-secundario text-red-600" onClick={() => establecerAbonoAnular(abono)}>Anular</button> : null}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="panel overflow-hidden">
              <TituloSeccion icono={<CircleDollarSign />} titulo="Ventas" detalle={`${cliente.ventas.length} ventas`} />
              <div className="divide-y">
                {cliente.ventas.map((venta) => (
                  <article key={venta.id} className="p-4">
                    <div className="flex justify-between gap-3"><div><strong>{venta.folio}</strong><p className="text-xs text-slate-500">{new Date(venta.fechaVenta).toLocaleDateString("es-MX")} · {venta.tipo}</p></div><div className="text-right"><strong>{dinero.format(Number(venta.total))}</strong><p><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${clasesEstado[venta.estado] ?? "bg-slate-100"}`}>{venta.estado}</span></p></div></div>
                    <ul className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-300">{venta.detalles.map((detalle) => <li key={detalle.productoSku}>{detalle.cantidad} × {detalle.productoNombre} · {dinero.format(Number(detalle.total))}</li>)}</ul>
                    {puedeEditar && venta.estado === "CONFIRMADA" && <Link href={`/devoluciones?ventaId=${venta.id}`} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600"><RotateCcw size={14} /> Devolución o cancelación</Link>}
                  </article>
                ))}
              </div>
            </div>
            <div className="panel overflow-hidden">
              <TituloSeccion icono={<ClipboardList />} titulo="Pedidos" detalle={`${cliente.pedidos.length} pedidos`} />
              <div className="divide-y">
                {cliente.pedidos.map((pedido) => (
                  <article key={pedido.id} className="p-4 text-sm">
                    <div className="flex justify-between"><strong>{pedido.folio}</strong><span className="text-xs font-semibold">{pedido.estado}</span></div>
                    <ul className="mt-2 space-y-1 text-xs text-slate-500">{pedido.items.map((item, indice) => <li key={indice}>{item.cantidad} × {item.descripcion} · {item.proveedor?.nombre ?? "Proveedor por confirmar"}</li>)}</ul>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      <Modal abierto={editar} cerrar={() => establecerEditar(false)} titulo="Editar cliente">
        {cliente && <form onSubmit={guardarCliente} className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className="etiqueta">Nombre completo</span><input name="nombreCompleto" className="campo" defaultValue={cliente.nombreCompleto} required /></label>
          <label><span className="etiqueta">Teléfono</span><input name="telefono" className="campo" defaultValue={cliente.telefono} required /></label>
          <label><span className="etiqueta">Localidad</span><select name="localidadId" className="campo" defaultValue={cliente.localidad.id}>{localidades.map((localidad) => <option key={localidad.id} value={localidad.id}>{localidad.nombre}, {localidad.estado}</option>)}</select></label>
          <label className="sm:col-span-2"><span className="etiqueta">Dirección</span><textarea name="direccion" className="campo min-h-24 py-3" defaultValue={cliente.direccion} required /></label>
          <label><span className="etiqueta">Límite de crédito</span><input name="limiteCredito" className="campo" type="number" min="0" step="0.01" defaultValue={cliente.limiteCredito} /></label>
          <label><span className="etiqueta">Notas</span><input name="notas" className="campo" defaultValue={cliente.notas ?? ""} /></label>
          <div className="sm:col-span-2 flex justify-end gap-2"><button type="button" className="boton-secundario" onClick={() => establecerEditar(false)}>Cancelar</button><button className="boton-primario">Guardar cambios</button></div>
        </form>}
      </Modal>
      <Modal abierto={Boolean(abonoAnular)} cerrar={() => establecerAbonoAnular(null)} titulo="Anular abono">
        <form onSubmit={anular} className="space-y-4"><p className="text-sm">El saldo aumentará {dinero.format(Number(abonoAnular?.monto ?? 0))} y las cuotas se reabrirán. El registro original se conservará.</p><label><span className="etiqueta">Motivo obligatorio</span><textarea name="motivo" className="campo min-h-28 py-3" minLength={10} required /></label><div className="flex justify-end gap-2"><button type="button" className="boton-secundario" onClick={() => establecerAbonoAnular(null)}>Cancelar</button><button className="boton-primario bg-red-600 hover:bg-red-700">Confirmar anulación</button></div></form>
      </Modal>
    </>
  );
}

function Resumen({ icono, etiqueta, valor, rojo = false }: { icono: React.ReactNode; etiqueta: string; valor: string; rojo?: boolean }) {
  return <div className="panel p-5"><div className={rojo ? "text-red-600" : "text-blue-600"}>{icono}</div><p className="mt-4 text-xs uppercase tracking-wide text-slate-500">{etiqueta}</p><p className={`mt-1 text-xl font-semibold ${rojo ? "text-red-600" : ""}`}>{valor}</p></div>;
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{etiqueta}</p><p className="mt-1 font-medium">{valor}</p></div>;
}

function TituloSeccion({ icono, titulo, detalle }: { icono: React.ReactNode; titulo: string; detalle: string }) {
  return <div className="flex items-center justify-between border-b p-4"><h2 className="flex items-center gap-2 font-semibold text-slate-800 dark:text-white">{icono}{titulo}</h2><span className="text-xs text-slate-500">{detalle}</span></div>;
}
