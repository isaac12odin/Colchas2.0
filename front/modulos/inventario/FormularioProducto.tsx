"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { IndicadorPasosOperacion } from "@/componentes/AsistenteOperacion";
import { PasoExistenciaProducto } from "./PasoExistenciaProducto";
import { PasoIdentidadProducto } from "./PasoIdentidadProducto";
import { PasoPreciosProducto } from "./PasoPreciosProducto";
import type {
  CategoriaProducto,
  DatosProductoWeb,
  ProductoInventario,
} from "./tipos";
import { usarFormularioProducto } from "./usarFormularioProducto";

export function FormularioProducto({
  producto,
  es,
  guardando,
  cancelar,
  marcas = [],
  categorias = [],
  alCrearCategoria,
  alCancelar,
  alGuardar,
}: {
  producto?: ProductoInventario | null;
  es: boolean;
  guardando: boolean;
  cancelar: string;
  marcas?: string[];
  categorias?: CategoriaProducto[];
  alCrearCategoria: (nombre: string) => Promise<CategoriaProducto | null>;
  alCancelar: () => void;
  alGuardar: (datos: DatosProductoWeb) => Promise<void>;
}) {
  const control = usarFormularioProducto({ producto, alGuardar });
  const puedeSeguir =
    control.paso === 1 ? control.identidadValida : control.preciosValidos;

  return (
    <form
      onSubmit={control.enviar}
      data-capacitacion="inventario.producto.formulario"
    >
      <IndicadorPasosOperacion
        actual={control.paso}
        pasos={[
          {
            titulo: es ? "1. Identificar" : "1. Identify",
            descripcion: es
              ? "Tipo, marca, nombre y SKU"
              : "Type, brand, name, SKU",
          },
          {
            titulo: es ? "2. Precio" : "2. Price",
            descripcion: es ? "Costo, venta y utilidad" : "Cost, sale, profit",
          },
          {
            titulo: es ? "3. Existencia" : "3. Stock",
            descripcion: es
              ? "Conteo, alerta y revisión"
              : "Count, alert, review",
          },
        ]}
      />

      {control.paso === 1 && (
        <PasoIdentidadProducto
          control={control}
          producto={producto}
          marcas={marcas}
          categorias={categorias}
          alCrearCategoria={alCrearCategoria}
          es={es}
        />
      )}
      {control.paso === 2 && <PasoPreciosProducto control={control} es={es} />}
      {control.paso === 3 && (
        <PasoExistenciaProducto
          control={control}
          producto={producto}
          categoriaNombre={
            categorias.find(
              (categoria) => categoria.id === control.valores.categoriaId,
            )?.nombre ?? ""
          }
          es={es}
        />
      )}

      <div className="mt-6 flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-between">
        <button
          type="button"
          className="boton-secundario justify-center"
          onClick={alCancelar}
        >
          {cancelar}
        </button>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {control.paso > 1 && (
            <button
              key="continuar-producto"
              type="button"
              className="boton-secundario justify-center"
              onClick={control.anterior}
              data-capacitacion="inventario.producto.atras"
            >
              <ChevronLeft size={17} /> {es ? "Atrás" : "Back"}
            </button>
          )}
          {control.paso < 3 ? (
            <button
              type="button"
              className="boton-primario justify-center"
              disabled={!puedeSeguir}
              onClick={control.siguiente}
              data-capacitacion={`inventario.producto.continuar-${control.paso}`}
            >
              {es ? "Continuar" : "Continue"} <ChevronRight size={17} />
            </button>
          ) : (
            <button
              key="guardar-producto"
              type="submit"
              className="boton-primario justify-center"
              disabled={guardando || !control.existenciaValida}
              data-capacitacion="inventario.producto.guardar"
            >
              {guardando
                ? es
                  ? "Guardando…"
                  : "Saving…"
                : producto
                  ? es
                    ? "Guardar producto"
                    : "Save product"
                  : es
                    ? "Crear producto y existencia"
                    : "Create product and stock"}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
