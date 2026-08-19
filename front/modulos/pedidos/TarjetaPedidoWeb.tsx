import { Check, PackageOpen } from "lucide-react";

import { etiquetaSiguiente, siguienteEstado, type PedidoWeb } from "./tipos";

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export function TarjetaPedidoWeb({
  pedido,
  es,
  puedeAlmacen,
  puedeEntregar,
  alAvanzar,
  alEntregar,
}: {
  pedido: PedidoWeb;
  es: boolean;
  puedeAlmacen: boolean;
  puedeEntregar: boolean;
  alAvanzar: () => void;
  alEntregar: () => void;
}) {
  return (
    <article className="panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-slate-500">{pedido.folio}</p>
          <h2 className="mt-1 font-semibold">
            {pedido.cliente.nombreCompleto}
          </h2>
        </div>
        <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-950">
          {pedido.estado}
        </span>
      </div>
      <div className="my-4 space-y-2 border-y py-3">
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
      <div className="flex flex-wrap gap-2">
        {puedeAlmacen && siguienteEstado[pedido.estado] && (
          <button className="boton-secundario flex-1" onClick={alAvanzar}>
            <PackageOpen size={17} />
            {es ? etiquetaSiguiente[siguienteEstado[pedido.estado]] : "Advance"}
          </button>
        )}
        {puedeEntregar &&
          ["RECIBIDO_ALMACEN", "LISTO_ENTREGA"].includes(pedido.estado) && (
            <button className="boton-primario flex-1" onClick={alEntregar}>
              <Check size={17} />
              {es ? "Entregar" : "Deliver"}
            </button>
          )}
      </div>
    </article>
  );
}
