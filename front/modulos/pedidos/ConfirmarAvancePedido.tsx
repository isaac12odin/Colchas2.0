"use client";

import { useState } from "react";

import { AyudaPaso } from "@/componentes/AsistenteOperacion";
import { etiquetaEstadoPedido, siguienteEstado, type PedidoWeb } from "./tipos";

export function ConfirmarAvancePedido({
  pedido,
  es,
  guardando,
  alCancelar,
  alConfirmar,
}: {
  pedido: PedidoWeb;
  es: boolean;
  guardando: boolean;
  alCancelar: () => void;
  alConfirmar: () => Promise<void>;
}) {
  const [verificados, establecerVerificados] = useState<string[]>([]);
  const siguiente = siguienteEstado[pedido.estado];
  const esRecepcion = siguiente === "RECIBIDO_ALMACEN";
  const todosVerificados = pedido.items.every((item) =>
    verificados.includes(item.id),
  );

  return (
    <div className="space-y-5" data-capacitacion="pedidos.almacen.confirmacion">
      <AyudaPaso
        titulo={
          esRecepcion
            ? es
              ? "Antes: cuenta lo que llegó"
              : "First: count received goods"
            : es
              ? "Antes: separa y etiqueta el paquete"
              : "First: prepare and label the package"
        }
        tono="ambar"
      >
        {esRecepcion
          ? es
            ? "Marca cada renglón sólo después de comparar producto y cantidad contra lo recibido físicamente."
            : "Check each line only after comparing it with the physical receipt."
          : es
            ? "Marca cada renglón cuando las piezas estén completas, apartadas y listas para salir."
            : "Check each line once it is complete and ready to leave."}
      </AyudaPaso>

      <div className="space-y-2">
        {pedido.items.map((item) => (
          <label
            key={item.id}
            className="flex cursor-pointer items-start gap-3 rounded-xl border p-4"
          >
            <input
              type="checkbox"
              className="mt-1 size-5"
              checked={verificados.includes(item.id)}
              onChange={(evento) =>
                establecerVerificados((actuales) =>
                  evento.target.checked
                    ? [...actuales, item.id]
                    : actuales.filter((id) => id !== item.id),
                )
              }
              data-capacitacion="pedidos.almacen.articulo-verificado"
            />
            <span>
              <strong className="block">
                {item.cantidad} × {item.descripcion}
              </strong>
              <small className="text-slate-500">
                {item.proveedor?.nombre ??
                  (es ? "Proveedor sin asignar" : "No supplier")}
              </small>
            </span>
          </label>
        ))}
      </div>

      <AyudaPaso titulo={es ? "Qué cambiará" : "What will change"} tono="verde">
        {es ? (
          <>
            El pedido pasará de{" "}
            <strong>{etiquetaEstadoPedido[pedido.estado]}</strong> a{" "}
            <strong>{etiquetaEstadoPedido[siguiente] ?? siguiente}</strong>.{" "}
            {esRecepcion
              ? "Este cambio no suma existencias: si llegó mercancía nueva, primero registra la compra en Compras."
              : "Este cambio no crea venta, no descuenta inventario y no genera deuda; eso ocurre al entregar."}
          </>
        ) : (
          <>
            Only the order status changes. Stock and sales are not changed here.
          </>
        )}
      </AyudaPaso>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className="boton-secundario" onClick={alCancelar}>
          {es ? "Cancelar" : "Cancel"}
        </button>
        <button
          type="button"
          className="boton-primario"
          disabled={!todosVerificados || guardando}
          onClick={() => void alConfirmar()}
          data-capacitacion="pedidos.almacen.confirmar-avance"
        >
          {guardando
            ? es
              ? "Actualizando…"
              : "Updating…"
            : esRecepcion
              ? es
                ? "Confirmar recepción física"
                : "Confirm receipt"
              : es
                ? "Confirmar paquete listo"
                : "Confirm ready package"}
        </button>
      </div>
    </div>
  );
}
