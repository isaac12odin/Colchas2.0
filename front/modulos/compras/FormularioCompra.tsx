"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { IndicadorPasosOperacion } from "@/componentes/AsistenteOperacion";
import { PasoArticulosCompra } from "./PasoArticulosCompra";
import { PasoProveedorCompra } from "./PasoProveedorCompra";
import { PasoRevisionCompra } from "./PasoRevisionCompra";
import type {
  NuevaCompraWeb,
  PedidoPendienteCompra,
  ProveedorCompra,
} from "./tipos";
import { usarFormularioCompra } from "./usarFormularioCompra";

export function FormularioCompra({
  proveedores,
  pedidos,
  es,
  guardando,
  alCancelar,
  alGuardar,
}: {
  proveedores: ProveedorCompra[];
  pedidos: PedidoPendienteCompra[];
  es: boolean;
  guardando: boolean;
  alCancelar: () => void;
  alGuardar: (datos: NuevaCompraWeb) => Promise<void>;
}) {
  const control = usarFormularioCompra({ alGuardar });
  const puedeContinuar =
    control.paso === 1
      ? Boolean(control.proveedorId && control.fechaCompra)
      : control.lineasValidas;
  return (
    <form
      onSubmit={control.enviar}
      data-capacitacion="compras.compra.formulario"
    >
      <IndicadorPasosOperacion
        actual={control.paso}
        pasos={[
          {
            titulo: es ? "1. Comprobante" : "1. Document",
            descripcion: es ? "Proveedor y fecha" : "Supplier and date",
          },
          {
            titulo: es ? "2. Mercancía" : "2. Goods",
            descripcion: es
              ? "Producto, conteo y costo"
              : "Product, count, cost",
          },
          {
            titulo: es ? "3. Revisar" : "3. Review",
            descripcion: es ? "Inventario y total" : "Stock and total",
          },
        ]}
      />
      {control.paso === 1 && (
        <PasoProveedorCompra
          control={control}
          proveedores={proveedores}
          es={es}
        />
      )}
      {control.paso === 2 && (
        <PasoArticulosCompra control={control} pedidos={pedidos} es={es} />
      )}
      {control.paso === 3 && (
        <PasoRevisionCompra
          control={control}
          proveedores={proveedores}
          pedidos={pedidos}
          es={es}
        />
      )}
      <div className="mt-6 flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-between">
        <button type="button" className="boton-secundario" onClick={alCancelar}>
          {es ? "Cancelar" : "Cancel"}
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
              key="continuar-compra"
              type="button"
              className="boton-primario"
              disabled={!puedeContinuar}
              onClick={control.siguiente}
              data-capacitacion={`compras.compra.continuar-${control.paso}`}
            >
              {es ? "Continuar" : "Continue"} <ChevronRight size={17} />
            </button>
          ) : (
            <button
              key="guardar-compra"
              type="submit"
              className="boton-primario"
              disabled={guardando || !control.lineasValidas}
              data-capacitacion="compras.compra.guardar"
            >
              {guardando
                ? es
                  ? "Registrando…"
                  : "Saving…"
                : es
                  ? "Registrar compra y sumar existencias"
                  : "Record purchase and add stock"}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
