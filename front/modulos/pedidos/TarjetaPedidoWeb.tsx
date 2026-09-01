import { Check, Clock3, PackageOpen, Send } from "lucide-react";

import {
  etiquetaEstadoPedido,
  etiquetaSiguiente,
  type PedidoWeb,
  siguienteEstado,
} from "./tipos";

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export function TarjetaPedidoWeb({
  pedido,
  es,
  puedeAlmacen,
  puedeAsignarProveedor,
  puedeEntregar,
  destacado = false,
  alGestionar,
  alAvanzar,
  alEntregar,
}: {
  pedido: PedidoWeb;
  es: boolean;
  puedeAlmacen: boolean;
  puedeAsignarProveedor: boolean;
  puedeEntregar: boolean;
  destacado?: boolean;
  alGestionar: () => void;
  alAvanzar: () => void;
  alEntregar: () => void;
}) {
  const etapa =
    pedido.estado === "PENDIENTE_PEDIR" || pedido.estado === "PEDIDO_PROVEEDOR"
      ? 1
      : pedido.estado === "RECIBIDO_ALMACEN"
        ? 2
        : 3;
  const siguienteAccion =
    pedido.estado === "PENDIENTE_PEDIR"
      ? es
        ? "Siguiente: elegir quién surtirá cada artículo y enviar el pedido."
        : "Next: assign a supplier."
      : pedido.estado === "PEDIDO_PROVEEDOR"
        ? es
          ? "Siguiente: registrar la compra si llegó mercancía nueva y confirmar la recepción física."
          : "Next: record any purchase and confirm physical receipt."
        : pedido.estado === "RECIBIDO_ALMACEN"
          ? es
            ? "Siguiente: separar, etiquetar y marcar el paquete listo."
            : "Next: prepare and mark the package ready."
          : pedido.estado === "LISTO_ENTREGA"
            ? es
              ? "Siguiente: entregar; ahí se creará la venta y se afectará inventario y saldo."
              : "Next: deliver and create the sale."
            : "";
  return (
    <article
      className={`panel p-5 ${destacado ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-950" : ""}`}
      data-capacitacion="pedidos.tarjeta"
      data-capacitacion-estado={pedido.estado}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-slate-500">{pedido.folio}</p>
          <h2 className="mt-1 font-semibold">
            {pedido.cliente.nombreCompleto}
          </h2>
        </div>
        <span
          className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-950"
          data-capacitacion="pedidos.tarjeta.estado"
        >
          {es
            ? (etiquetaEstadoPedido[pedido.estado] ?? pedido.estado)
            : pedido.estado}
        </span>
      </div>
      {!["CANCELADO"].includes(pedido.estado) && (
        <div
          className="mt-4 grid grid-cols-3 gap-1"
          aria-label={es ? "Progreso del pedido" : "Order progress"}
          data-capacitacion="pedidos.tarjeta.progreso"
        >
          {[
            es ? "1. Proveedor" : "1. Supplier",
            es ? "2. Almacén" : "2. Warehouse",
            es ? "3. Entrega" : "3. Delivery",
          ].map((texto, indice) => (
            <div
              key={texto}
              className={`rounded-lg px-2 py-2 text-center text-[10px] font-bold ${indice + 1 <= etapa ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-900"}`}
            >
              {texto}
            </div>
          ))}
        </div>
      )}
      <div
        className="my-4 space-y-2 border-y py-3"
        data-capacitacion="pedidos.tarjeta.articulos"
      >
        {pedido.items.map((item, indice) => (
          <div key={indice} className="flex justify-between gap-3 text-sm">
            <span>
              {item.cantidad} × {item.descripcion}
              {item.proveedor && (
                <small className="block text-slate-500">
                  {es ? "Surtió" : "Supplier"}: {item.proveedor.nombre}
                </small>
              )}
            </span>
            <strong>
              {dinero.format(Number(item.precioEstimado) * item.cantidad)}
            </strong>
          </div>
        ))}
      </div>
      {pedido.fechaCompromiso && (
        <p className="mb-4 text-xs text-slate-500">
          {es ? "Compromiso" : "Due"}:{" "}
          {new Date(pedido.fechaCompromiso).toLocaleDateString(
            es ? "es-MX" : "en-US",
          )}
        </p>
      )}
      {siguienteAccion && (
        <p className="mb-4 rounded-xl bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-700 dark:bg-slate-950 dark:text-slate-200">
          {siguienteAccion}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {puedeAsignarProveedor && pedido.estado === "PENDIENTE_PEDIR" && (
          <button
            className="boton-primario flex-1"
            onClick={alGestionar}
            data-capacitacion="pedidos.proveedor.abrir"
          >
            <Send size={17} />
            {es ? "Elegir proveedor y pedir" : "Assign supplier and order"}
          </button>
        )}
        {puedeAlmacen &&
          pedido.estado !== "PENDIENTE_PEDIR" &&
          siguienteEstado[pedido.estado] && (
            <button
              className="boton-secundario flex-1"
              onClick={alAvanzar}
              data-capacitacion={`pedidos.almacen.avanzar.${pedido.estado}`}
              data-capacitacion-entidad={pedido.id}
              data-capacitacion-estado={pedido.estado}
            >
              <PackageOpen size={17} />
              {es
                ? pedido.estado === "PEDIDO_PROVEEDOR"
                  ? "Revisar recepción"
                  : pedido.estado === "RECIBIDO_ALMACEN"
                    ? "Revisar paquete"
                    : etiquetaSiguiente[siguienteEstado[pedido.estado]]
                : "Advance"}
            </button>
          )}
        {puedeEntregar && pedido.estado === "LISTO_ENTREGA" && (
          <button
            className="boton-primario flex-1"
            onClick={alEntregar}
            data-capacitacion="pedidos.entrega.abrir"
          >
            <Check size={17} />
            {es ? "Revisar y entregar" : "Review and deliver"}
          </button>
        )}
      </div>
      {!puedeAsignarProveedor && pedido.estado === "PENDIENTE_PEDIR" && (
        <p className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          <Clock3 size={16} />
          {es
            ? "En espera de Administración, Contabilidad o Almacén. El cobrador no puede asignar proveedores."
            : "Waiting for Administration, Accounting, or Warehouse. Collectors cannot assign suppliers."}
        </p>
      )}
    </article>
  );
}
