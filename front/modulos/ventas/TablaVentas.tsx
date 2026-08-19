import { Fragment, useState } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";

import { EstadoVacio, Paginador } from "@/componentes/ui";
import { api } from "@/lib/api";
import type { ControlVentasWeb } from "./usarVentasWeb";
import type { VentaDetalleWeb } from "./tipos";

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
    <div className="panel overflow-hidden">
      <form
        className="flex gap-2 border-b p-4"
        onSubmit={(evento) => {
          evento.preventDefault();
          control.cargar();
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-slate-400" size={18} />
          <input
            className="campo pl-10"
            value={control.buscar}
            onChange={(evento) => control.establecerBuscar(evento.target.value)}
            placeholder={es ? "Folio o cliente" : "Invoice or customer"}
          />
        </div>
        <button className="boton-secundario">{buscarTexto}</button>
      </form>
      <div className="overflow-x-auto">
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
                <tr>
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
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="rounded-lg border bg-white p-4 dark:bg-slate-900">
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
      <section className="rounded-lg border bg-white p-4 dark:bg-slate-900">
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
      <section className="rounded-lg border bg-white p-4 dark:bg-slate-900">
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
