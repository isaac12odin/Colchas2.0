import { Fragment, useState } from "react";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";

import { EstadoVacio, Paginador } from "@/componentes/ui";
import { api } from "@/lib/api";
import type { ControlVentasWeb } from "./usarVentasWeb";
import type { VentaDetalleWeb } from "./tipos";
import { TarjetaVentaMovil } from "./TarjetaVentaMovil";

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export function TablaVentas({
  control,
  es,
  buscarTexto,
  mostrarCostos,
}: {
  control: ControlVentasWeb;
  es: boolean;
  buscarTexto: string;
  mostrarCostos: boolean;
}) {
  const [detalle, establecerDetalle] = useState<VentaDetalleWeb | null>(null);
  const [cargandoId, establecerCargandoId] = useState("");

  async function alternarDetalle(id: string) {
    if (detalle?.id === id) {
      establecerDetalle(null);
      return;
    }
    establecerCargandoId(id);
    try {
      establecerDetalle(await api<VentaDetalleWeb>(`/ventas/${id}`));
    } finally {
      establecerCargandoId("");
    }
  }

  return (
    <div className="panel overflow-hidden" data-capacitacion="ventas.lista">
      <form
        className="flex flex-col gap-2 border-b p-4 sm:flex-row"
        onSubmit={(evento) => {
          evento.preventDefault();
          control.aplicarBusqueda();
        }}
        data-capacitacion="ventas.busqueda"
      >
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-3 text-slate-400" size={18} />
          <input
            className="campo pl-10 pr-10"
            data-capacitacion="ventas.busqueda.campo"
            value={control.buscar}
            onChange={(evento) => control.establecerBuscar(evento.target.value)}
            placeholder={es ? "Folio o cliente" : "Invoice or customer"}
          />
          {control.buscar && (
            <button
              type="button"
              className="absolute right-2 top-2 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={control.limpiarBusqueda}
              aria-label={es ? "Limpiar búsqueda" : "Clear search"}
            >
              <X size={17} />
            </button>
          )}
        </div>
        <button
          className="boton-secundario sm:w-auto"
          data-capacitacion="ventas.busqueda.ejecutar"
        >
          <Search size={17} aria-hidden />
          {buscarTexto}
        </button>
      </form>
      <div className="md:hidden">
        {control.respuesta?.datos.map((venta) => (
          <TarjetaVentaMovil
            key={venta.id}
            venta={venta}
            es={es}
            abierta={detalle?.id === venta.id}
            cargando={cargandoId === venta.id}
            alAlternar={() => void alternarDetalle(venta.id)}
          >
            {detalle?.id === venta.id && (
              <DetalleVenta
                venta={detalle}
                es={es}
                mostrarCostos={mostrarCostos}
              />
            )}
          </TarjetaVentaMovil>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950">
            <tr>
              <th className="px-4 py-3">
                {es ? "Folio / Fecha" : "Invoice / Date"}
              </th>
              <th className="px-4 py-3">{es ? "Cliente" : "Customer"}</th>
              <th className="px-4 py-3">{es ? "Tipo" : "Type"}</th>
              <th className="px-4 py-3">{es ? "Registró" : "Created by"}</th>
              <th className="px-4 py-3 text-right">
                {es ? "Anticipo" : "Deposit"}
              </th>
              <th className="px-4 py-3 text-right">Total</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y">
            {control.respuesta?.datos.map((venta) => (
              <Fragment key={venta.id}>
                <tr data-capacitacion="ventas.lista.fila">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs font-semibold">
                      {venta.folio}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(venta.fechaVenta).toLocaleDateString(
                        es ? "es-MX" : "en-US",
                      )}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {venta.cliente?.nombreCompleto ??
                      (es ? "Público general" : "General public")}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950">
                      {venta.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3">{venta.usuario.nombre}</td>
                  <td className="px-4 py-3 text-right">
                    {dinero.format(Number(venta.anticipo))}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {dinero.format(Number(venta.total))}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="boton-secundario whitespace-nowrap"
                      onClick={() => void alternarDetalle(venta.id)}
                      disabled={cargandoId === venta.id}
                      data-capacitacion="ventas.detalle.abrir"
                    >
                      {detalle?.id === venta.id ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                      {cargandoId === venta.id
                        ? "…"
                        : es
                          ? "Detalle"
                          : "Details"}
                    </button>
                  </td>
                </tr>
                {detalle?.id === venta.id && (
                  <tr>
                    <td
                      colSpan={7}
                      className="bg-slate-50 p-4 dark:bg-slate-950"
                      data-capacitacion="ventas.detalle"
                    >
                      <DetalleVenta
                        venta={detalle}
                        es={es}
                        mostrarCostos={mostrarCostos}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {control.respuesta?.datos.length === 0 && (
        <EstadoVacio
          texto={es ? "No hay ventas registradas." : "No sales recorded."}
        />
      )}
      {control.respuesta && (
        <Paginador
          pagina={control.respuesta.paginacion.pagina}
          totalPaginas={control.respuesta.paginacion.totalPaginas}
          cambiar={control.establecerPagina}
        />
      )}
    </div>
  );
}

function DetalleVenta({
  venta,
  es,
  mostrarCostos,
}: {
  venta: VentaDetalleWeb;
  es: boolean;
  mostrarCostos: boolean;
}) {
  return (
    <div
      className="grid gap-4 lg:grid-cols-3"
      data-capacitacion="ventas.detalle.revision"
    >
      <section
        className="rounded-lg border bg-white p-4 dark:bg-slate-900"
        data-capacitacion="ventas.detalle.productos"
      >
        <h3 className="font-semibold">{es ? "Productos" : "Products"}</h3>
        <div className="mt-3 space-y-3">
          {venta.detalles.map((item) => (
            <div key={item.id} className="text-sm">
              <strong className="block">{item.productoNombre}</strong>
              <small className="text-slate-500">
                {item.productoSku} · {item.productoMarca}
              </small>
              <div className="mt-1 flex justify-between gap-2">
                <span>
                  {item.cantidad} × {dinero.format(Number(item.precioUnitario))}
                </span>
                <strong>{dinero.format(Number(item.total))}</strong>
              </div>
              {mostrarCostos && item.costoUnitario !== undefined && (
                <small className="text-slate-500">
                  {es ? "Costo histórico" : "Historical cost"}:{" "}
                  {dinero.format(Number(item.costoUnitario))}
                </small>
              )}
            </div>
          ))}
        </div>
      </section>
      <section
        className="rounded-lg border bg-white p-4 dark:bg-slate-900"
        data-capacitacion="ventas.detalle.plan-pago"
      >
        <h3 className="font-semibold">
          {es ? "Plan de pago" : "Payment plan"}
        </h3>
        {venta.planPago ? (
          <>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {venta.planPago.numeroCuotas} ×{" "}
              {dinero.format(Number(venta.planPago.montoCuota))} ·{" "}
              {venta.planPago.periodicidad}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {
                venta.planPago.cuotas.filter(
                  (cuota) => cuota.estado === "PAGADA",
                ).length
              }
              /{venta.planPago.numeroCuotas}{" "}
              {es ? "cuotas pagadas" : "installments paid"}
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            {es ? "Venta sin financiamiento." : "Sale without financing."}
          </p>
        )}
      </section>
      <section
        className="rounded-lg border bg-white p-4 dark:bg-slate-900"
        data-capacitacion="ventas.detalle.abonos"
      >
        <h3 className="font-semibold">{es ? "Abonos" : "Payments"}</h3>
        <div className="mt-3 space-y-2">
          {venta.abonos.map((abono) => (
            <div key={abono.id} className="flex justify-between gap-3 text-sm">
              <span>
                {new Date(abono.fechaAbono).toLocaleDateString(
                  es ? "es-MX" : "en-US",
                )}
                <small className="ml-2 text-slate-500">{abono.metodo}</small>
              </span>
              <strong>{dinero.format(Number(abono.monto))}</strong>
            </div>
          ))}
          {!venta.abonos.length && (
            <p className="text-sm text-slate-500">
              {es ? "Todavía no hay abonos." : "No payments yet."}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
