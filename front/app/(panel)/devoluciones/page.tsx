"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Camera, Plus, RotateCcw, Search } from "lucide-react";
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
import { SelectorProductoRemoto } from "@/componentes/SelectoresRemotos";
import type { ProductoPedido } from "@/modulos/pedidos/tipos";

interface VentaLista {
  id: string;
  folio: string;
  estado: string;
  total: string;
  fechaVenta: string;
  cliente: { nombreCompleto: string } | null;
}

interface VentaDetalle extends VentaLista {
  cliente:
    | ({
        nombreCompleto: string;
        saldo: { saldoActual: string } | null;
      } & Record<string, unknown>)
    | null;
  detalles: Array<{
    id: string;
    productoNombre: string;
    productoSku: string;
    cantidad: number;
    precioUnitario: string;
  }>;
  planPago: {
    cuotas: Array<{ monto: string; montoPagado: string }>;
  } | null;
  devoluciones: Array<{
    detalles: Array<{ detalleVentaId: string; cantidad: number }>;
  }>;
}

interface Devolucion {
  id: string;
  folio: string;
  tipo: string;
  motivo: string;
  totalDevuelto: string;
  aplicadoSaldo: string;
  montoReembolsado: string;
  creadoEn: string;
  evidenciaMime: string | null;
  venta: { folio: string };
  cliente: { nombreCompleto: string } | null;
  autorizadoPor: { nombre: string };
  usuarioOperador: { nombre: string } | null;
}

interface OperadorCaja {
  id: string;
  nombre: string;
  rol: "ADMINISTRADOR" | "COBRADOR";
}

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

function archivoBase64(archivo: File) {
  return new Promise<string>((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onerror = () =>
      rechazar(new Error("No se pudo leer la fotografía."));
    lector.onload = () => resolver(String(lector.result).split(",")[1] ?? "");
    lector.readAsDataURL(archivo);
  });
}

export default function PaginaDevoluciones() {
  const { idioma, usuario } = usarAplicacion();
  const parametros = useSearchParams();
  const es = idioma === "es";
  const puedeAutorizar =
    usuario?.rol === "ADMINISTRADOR" || usuario?.rol === "CONTABLE";
  const [respuesta, establecerRespuesta] = useState<Pagina<Devolucion> | null>(
    null,
  );
  const [pagina, establecerPagina] = useState(1);
  const [buscar, establecerBuscar] = useState("");
  const [buscarVenta, establecerBuscarVenta] = useState("");
  const [ventas, establecerVentas] = useState<VentaLista[]>([]);
  const [venta, establecerVenta] = useState<VentaDetalle | null>(null);
  const [cantidades, establecerCantidades] = useState<Record<string, number>>(
    {},
  );
  const [tipo, establecerTipo] = useState("PARCIAL");
  const [reemplazo, establecerReemplazo] = useState<ProductoPedido | null>(
    null,
  );
  const [cantidadReemplazo, establecerCantidadReemplazo] = useState("1");
  const [modal, establecerModal] = useState(false);
  const [operadores, establecerOperadores] = useState<OperadorCaja[]>([]);
  const [operadorId, establecerOperadorId] = useState("");
  const [error, establecerError] = useState("");

  const cargar = useCallback(() => {
    api<Pagina<Devolucion>>(
      `/devoluciones?pagina=${pagina}&limite=15&buscar=${encodeURIComponent(buscar)}`,
    )
      .then(establecerRespuesta)
      .catch((e) => establecerError(e.message));
  }, [pagina, buscar]);
  useEffect(cargar, [cargar]);
  usarDatosVivos(cargar);
  useEffect(() => {
    if (!puedeAutorizar) return;
    api<{ datos: OperadorCaja[] }>("/cortes/operadores")
      .then(({ datos }) => {
        establecerOperadores(datos);
        establecerOperadorId((actual) => {
          if (actual) return actual;
          return usuario?.rol === "ADMINISTRADOR" ? usuario.id : "";
        });
      })
      .catch((e) =>
        establecerError(
          e instanceof ErrorApi
            ? e.message
            : "No se pudieron cargar los operadores de caja.",
        ),
      );
  }, [puedeAutorizar, usuario?.id, usuario?.rol]);

  const elegirVenta = useCallback(async (id: string) => {
    try {
      const detalle = await api<VentaDetalle>(`/ventas/${id}`);
      establecerVenta(detalle);
      establecerCantidades({});
      establecerModal(true);
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
    }
  }, []);
  useEffect(() => {
    const id = parametros.get("ventaId");
    if (id) void elegirVenta(id);
  }, [parametros, elegirVenta]);
  useEffect(() => {
    const espera = setTimeout(() => {
      api<Pagina<VentaLista>>(
        `/ventas?limite=10&buscar=${encodeURIComponent(buscarVenta)}`,
      )
        .then((r) =>
          establecerVentas(r.datos.filter((v) => v.estado === "CONFIRMADA")),
        )
        .catch(() => establecerVentas([]));
    }, 250);
    return () => clearTimeout(espera);
  }, [buscarVenta]);

  const disponible = useCallback(
    (detalleId: string, vendido: number) =>
      vendido -
      (venta?.devoluciones ?? []).reduce(
        (suma, devolucion) =>
          suma +
          devolucion.detalles
            .filter((detalle) => detalle.detalleVentaId === detalleId)
            .reduce((parcial, detalle) => parcial + detalle.cantidad, 0),
        0,
      ),
    [venta],
  );
  const total = useMemo(
    () =>
      (venta?.detalles ?? []).reduce(
        (suma, detalle) =>
          suma + (cantidades[detalle.id] ?? 0) * Number(detalle.precioUnitario),
        0,
      ),
    [venta, cantidades],
  );
  const pendienteVenta = (venta?.planPago?.cuotas ?? []).reduce(
    (suma, cuota) =>
      suma + Math.max(0, Number(cuota.monto) - Number(cuota.montoPagado)),
    0,
  );
  const aplicadoSaldo = Math.min(
    total,
    Number(venta?.cliente?.saldo?.saldoActual ?? 0),
    pendienteVenta,
  );
  const reembolso = Math.max(0, total - aplicadoSaldo);

  function seleccionarTotal() {
    if (!venta) return;
    establecerTipo("TOTAL");
    establecerCantidades(
      Object.fromEntries(
        venta.detalles.map((detalle) => [
          detalle.id,
          disponible(detalle.id, detalle.cantidad),
        ]),
      ),
    );
  }

  async function registrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!venta) return;
    const formulario = new FormData(evento.currentTarget);
    const foto = formulario.get("evidencia");
    if (!(foto instanceof File) || foto.size === 0)
      return establecerError("Adjunte una fotografía de la devolución.");
    if (foto.size > 2_500_000)
      return establecerError("La fotografía no puede superar 2.5 MB.");
    try {
      await api("/devoluciones", {
        method: "POST",
        body: JSON.stringify({
          ventaId: venta.id,
          tipo,
          motivo: formulario.get("motivo"),
          montoReembolsado: reembolso,
          metodoReembolso:
            reembolso > 0 ? formulario.get("metodoReembolso") : undefined,
          usuarioOperadorId: reembolso > 0 ? operadorId : undefined,
          evidencia: {
            nombre: foto.name,
            mime: foto.type,
            base64: await archivoBase64(foto),
          },
          items: venta.detalles
            .filter((detalle) => (cantidades[detalle.id] ?? 0) > 0)
            .map((detalle) => ({
              detalleVentaId: detalle.id,
              cantidad: cantidades[detalle.id],
            })),
          reemplazos:
            tipo === "CAMBIO" && reemplazo
              ? [
                  {
                    productoId: reemplazo.id,
                    cantidad: Number(cantidadReemplazo),
                  },
                ]
              : undefined,
        }),
      });
      establecerModal(false);
      establecerVenta(null);
      cargar();
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
    }
  }

  return (
    <>
      <EncabezadoPagina
        titulo={
          es ? "Devoluciones y cancelaciones" : "Returns and cancellations"
        }
        descripcion={
          es
            ? "Reversa inventario y saldo sin borrar la venta ni sus abonos históricos."
            : "Reverse stock and balances while preserving history."
        }
        accion={
          puedeAutorizar ? (
            <button
              className="boton-primario"
              data-capacitacion="devoluciones.nueva.abrir"
              onClick={() => establecerModal(true)}
            >
              <Plus size={17} /> Devolución
            </button>
          ) : undefined
        }
      />
      {error && <MensajeError mensaje={error} />}
      <section className="panel overflow-hidden">
        <form
          className="flex gap-2 border-b p-4"
          onSubmit={(e) => {
            e.preventDefault();
            establecerPagina(1);
            cargar();
          }}
        >
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-3 text-slate-400"
            />
            <input
              className="campo pl-10"
              data-capacitacion="devoluciones.listado.buscar"
              value={buscar}
              onChange={(e) => establecerBuscar(e.target.value)}
              placeholder="Folio, venta o cliente"
            />
          </div>
          <button
            className="boton-secundario"
            data-capacitacion="devoluciones.listado.buscar-boton"
          >
            Buscar
          </button>
        </form>
        <div className="divide-y">
          {respuesta?.datos.map((devolucion) => (
            <article
              key={devolucion.id}
              data-capacitacion="devoluciones.listado.registro"
              className="flex flex-wrap items-center justify-between gap-4 p-5"
            >
              <div>
                <p className="font-mono text-xs text-slate-500">
                  {devolucion.folio} · {devolucion.venta.folio}
                </p>
                <h2 className="font-semibold">
                  {devolucion.cliente?.nombreCompleto ?? "Público general"}
                </h2>
                <p className="text-xs text-slate-500">
                  {new Date(devolucion.creadoEn).toLocaleString("es-MX")} ·{" "}
                  {devolucion.tipo} · autorizó {devolucion.autorizadoPor.nombre}
                </p>
                {devolucion.usuarioOperador && (
                  <p className="text-xs text-slate-500">
                    Caja: {devolucion.usuarioOperador.nombre}
                  </p>
                )}
                <p className="mt-2 text-sm">{devolucion.motivo}</p>
              </div>
              <div className="text-right">
                <strong>
                  {dinero.format(Number(devolucion.totalDevuelto))}
                </strong>
                <p className="text-xs text-slate-500">
                  Saldo {dinero.format(Number(devolucion.aplicadoSaldo))} ·
                  Reembolso {dinero.format(Number(devolucion.montoReembolsado))}
                </p>
                {devolucion.evidenciaMime && (
                  <a
                    href={`/api/devoluciones/${devolucion.id}/evidencia`}
                    target="_blank"
                    data-capacitacion="devoluciones.evidencia"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600"
                  >
                    <Camera size={14} /> Evidencia
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
        {respuesta?.datos.length === 0 && (
          <EstadoVacio texto="No hay devoluciones registradas." />
        )}
        {respuesta && (
          <Paginador
            pagina={respuesta.paginacion.pagina}
            totalPaginas={respuesta.paginacion.totalPaginas}
            cambiar={establecerPagina}
          />
        )}
      </section>

      <Modal
        abierto={modal}
        cerrar={() => {
          establecerModal(false);
          establecerVenta(null);
        }}
        titulo="Registrar devolución"
      >
        {!venta ? (
          <div data-capacitacion="devoluciones.venta.seleccion">
            <label>
              <span className="etiqueta">Buscar venta confirmada</span>
              <input
                className="campo"
                data-capacitacion="devoluciones.venta.buscar"
                value={buscarVenta}
                onChange={(e) => establecerBuscarVenta(e.target.value)}
                placeholder="Folio o cliente"
              />
            </label>
            <div className="mt-3 max-h-72 divide-y overflow-y-auto rounded-lg border">
              {ventas.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  data-capacitacion="devoluciones.venta.elegir"
                  className="flex w-full justify-between p-3 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                  onClick={() => void elegirVenta(item.id)}
                >
                  <span>
                    <strong>{item.folio}</strong>
                    <small className="block text-slate-500">
                      {item.cliente?.nombreCompleto ?? "Público general"}
                    </small>
                  </span>
                  <strong>{dinero.format(Number(item.total))}</strong>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <form
            onSubmit={registrar}
            className="space-y-5"
            data-capacitacion="devoluciones.formulario"
          >
            <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-100">
              <strong>
                {venta.folio} ·{" "}
                {venta.cliente?.nombreCompleto ?? "Público general"}
              </strong>
              <p>Total original {dinero.format(Number(venta.total))}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                data-capacitacion="devoluciones.tipo.parcial"
                className={
                  tipo === "PARCIAL" ? "boton-primario" : "boton-secundario"
                }
                onClick={() => establecerTipo("PARCIAL")}
              >
                Parcial
              </button>
              <button
                type="button"
                data-capacitacion="devoluciones.tipo.total"
                className={
                  tipo === "TOTAL" ? "boton-primario" : "boton-secundario"
                }
                onClick={seleccionarTotal}
              >
                Cancelar venta completa
              </button>
              <button
                type="button"
                data-capacitacion="devoluciones.tipo.cambio"
                className={
                  tipo === "CAMBIO" ? "boton-primario" : "boton-secundario"
                }
                onClick={() => establecerTipo("CAMBIO")}
              >
                Cambio
              </button>
            </div>
            <div className="space-y-3">
              {venta.detalles.map((detalle) => {
                const maximo = disponible(detalle.id, detalle.cantidad);
                return (
                  <label
                    key={detalle.id}
                    className="grid grid-cols-[1fr_100px] items-end gap-3 rounded-lg border p-3"
                  >
                    <span>
                      <strong className="block text-sm">
                        {detalle.productoNombre}
                      </strong>
                      <small className="text-slate-500">
                        {detalle.productoSku} · quedan {maximo} ·{" "}
                        {dinero.format(Number(detalle.precioUnitario))}
                      </small>
                    </span>
                    <span>
                      <span className="etiqueta">Cantidad</span>
                      <input
                        className="campo"
                        data-capacitacion="devoluciones.cantidad"
                        type="number"
                        min="0"
                        max={maximo}
                        value={cantidades[detalle.id] ?? 0}
                        onChange={(e) =>
                          establecerCantidades((a) => ({
                            ...a,
                            [detalle.id]: Number(e.target.value),
                          }))
                        }
                      />
                    </span>
                  </label>
                );
              })}
            </div>
            {tipo === "CAMBIO" && (
              <div
                className="rounded-xl border border-blue-200 p-4 dark:border-blue-900"
                data-capacitacion="devoluciones.reemplazo"
              >
                <h3 className="mb-3 font-semibold">Pedido de reemplazo</h3>
                <SelectorProductoRemoto
                  valor={reemplazo}
                  alCambiar={establecerReemplazo}
                  es={es}
                />
                <label className="mt-3 block">
                  <span className="etiqueta">Cantidad del reemplazo</span>
                  <input
                    className="campo"
                    data-capacitacion="devoluciones.reemplazo.cantidad"
                    type="number"
                    min="1"
                    value={cantidadReemplazo}
                    onChange={(e) =>
                      establecerCantidadReemplazo(e.target.value)
                    }
                    required
                  />
                </label>
                <p className="mt-2 text-xs text-slate-500">
                  Se creará un pedido pendiente. El nuevo saldo y el stock se
                  afectarán sólo cuando ese pedido se entregue.
                </p>
              </div>
            )}
            <div
              className="grid gap-3 rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-950 sm:grid-cols-3"
              data-capacitacion="devoluciones.resumen"
            >
              <div>
                <span className="text-xs text-slate-500">Total devuelto</span>
                <strong className="block">{dinero.format(total)}</strong>
              </div>
              <div>
                <span className="text-xs text-slate-500">Baja del saldo</span>
                <strong className="block">
                  {dinero.format(aplicadoSaldo)}
                </strong>
              </div>
              <div>
                <span className="text-xs text-slate-500">Reembolso</span>
                <strong className="block">{dinero.format(reembolso)}</strong>
              </div>
            </div>
            {reembolso > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="etiqueta">
                    Método del reembolso entregado
                  </span>
                  <select
                    name="metodoReembolso"
                    className="campo"
                    data-capacitacion="devoluciones.reembolso.metodo"
                    required
                  >
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                    <option value="TARJETA">Tarjeta</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </label>
                <label>
                  <span className="etiqueta">Caja que entrega el dinero</span>
                  <select
                    className="campo"
                    data-capacitacion="devoluciones.reembolso.operador"
                    value={operadorId}
                    onChange={(e) => establecerOperadorId(e.target.value)}
                    required
                  >
                    <option value="">Seleccione operador</option>
                    {operadores.map((operador) => (
                      <option key={operador.id} value={operador.id}>
                        {operador.nombre} · {operador.rol.toLowerCase()}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            <label>
              <span className="etiqueta">Motivo detallado</span>
              <textarea
                name="motivo"
                className="campo min-h-24 py-3"
                data-capacitacion="devoluciones.motivo"
                minLength={10}
                required
              />
            </label>
            <label>
              <span className="etiqueta">
                Fotografía de evidencia (máx. 2.5 MB)
              </span>
              <input
                name="evidencia"
                className="campo py-2"
                data-capacitacion="devoluciones.foto"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                required
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="boton-secundario"
                data-capacitacion="devoluciones.venta.cambiar"
                onClick={() => {
                  establecerVenta(null);
                  establecerCantidades({});
                }}
              >
                Cambiar venta
              </button>
              <button
                className="boton-primario"
                data-capacitacion="devoluciones.guardar"
                disabled={
                  total <= 0 ||
                  (reembolso > 0 && !operadorId) ||
                  (tipo === "CAMBIO" && !reemplazo)
                }
              >
                <RotateCcw size={17} /> Confirmar reversa
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
