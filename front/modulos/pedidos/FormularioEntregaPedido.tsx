"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { IndicadorPasosOperacion } from "@/componentes/AsistenteOperacion";
import { PasoArticulosEntrega } from "./PasoArticulosEntrega";
import { PasoCobroEntrega } from "./PasoCobroEntrega";
import { ResumenEntregaPedido } from "./ResumenEntregaPedido";
import type { DatosEntregaPedidoWeb, PedidoWeb } from "./tipos";
import { usarFormularioEntregaPedido } from "./usarFormularioEntregaPedido";

export function FormularioEntregaPedido({
  pedido,
  totalPedido,
  es,
  guardando,
  cancelar,
  alCancelar,
  alGuardar,
}: {
  pedido: PedidoWeb;
  totalPedido: number;
  es: boolean;
  guardando: boolean;
  cancelar: string;
  alCancelar: () => void;
  alGuardar: (datos: DatosEntregaPedidoWeb) => Promise<void>;
}) {
  const control = usarFormularioEntregaPedido({
    pedido,
    total: totalPedido,
    alGuardar,
  });
  return (
    <form
      onSubmit={control.enviar}
      data-capacitacion="pedidos.entrega.formulario"
    >
      <IndicadorPasosOperacion
        actual={control.paso}
        pasos={[
          {
            titulo: es ? "1. Verificar" : "1. Verify",
            descripcion: es ? "Cliente y paquete" : "Customer and package",
          },
          {
            titulo: es ? "2. Cobro" : "2. Payment",
            descripcion: es ? "Contado o crédito" : "Cash or credit",
          },
          {
            titulo: es ? "3. Confirmar" : "3. Confirm",
            descripcion: es
              ? "Venta, inventario y saldo"
              : "Sale, stock, balance",
          },
        ]}
      />
      {control.paso === 1 && (
        <PasoArticulosEntrega pedido={pedido} control={control} es={es} />
      )}
      {control.paso === 2 && (
        <PasoCobroEntrega control={control} total={totalPedido} es={es} />
      )}
      {control.paso === 3 && (
        <ResumenEntregaPedido
          pedido={pedido}
          control={control}
          total={totalPedido}
          es={es}
        />
      )}
      <div className="mt-6 flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-between">
        <button type="button" className="boton-secundario" onClick={alCancelar}>
          {cancelar}
        </button>
        <div className="flex gap-2">
          {control.paso > 1 && (
            <button
              type="button"
              className="boton-secundario"
              onClick={control.anterior}
            >
              <ChevronLeft size={17} /> {es ? "Atrás" : "Back"}
            </button>
          )}
          {control.paso < 3 ? (
            <button
              key="continuar-entrega"
              type="button"
              className="boton-primario"
              disabled={
                control.paso === 1
                  ? !control.todosVerificados
                  : !control.cobroValido
              }
              onClick={control.siguiente}
              data-capacitacion={`pedidos.entrega.continuar-${control.paso}`}
            >
              {es ? "Continuar" : "Continue"} <ChevronRight size={17} />
            </button>
          ) : (
            <button
              key="confirmar-entrega"
              type="submit"
              className="boton-primario"
              disabled={guardando || !control.cobroValido}
              data-capacitacion="pedidos.entrega.confirmar"
            >
              {guardando
                ? es
                  ? "Confirmando…"
                  : "Confirming…"
                : es
                  ? "Entregar, descontar inventario y crear venta"
                  : "Deliver, reduce stock, and create sale"}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
