"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { IndicadorPasosOperacion } from "@/componentes/AsistenteOperacion";
import { FormularioProducto } from "@/modulos/inventario/FormularioProducto";
import type {
  CategoriaProducto,
  CatalogosProducto,
  DatosProductoWeb,
} from "@/modulos/inventario/tipos";
import { PasoClienteNuevoPedido } from "./PasoClienteNuevoPedido";
import { PasoProductoNuevoPedido } from "./PasoProductoNuevoPedido";
import { ResumenNuevoPedido } from "./ResumenNuevoPedido";
import type { ProductoPedido } from "./tipos";
import { usarFormularioNuevoPedido } from "./usarFormularioNuevoPedido";

export interface NuevoPedidoWeb {
  clienteId: string;
  productoId: string;
  cantidad: number;
  fechaCompromiso?: string;
}

export function FormularioNuevoPedido({
  es,
  cancelar,
  guardando,
  guardandoProducto,
  puedeCrearProducto,
  catalogosProducto,
  alCancelar,
  alEnviar,
  alCrearProducto,
  alCrearCategoriaProducto,
}: {
  es: boolean;
  cancelar: string;
  guardar: string;
  guardando: boolean;
  guardandoProducto: boolean;
  puedeCrearProducto: boolean;
  catalogosProducto: CatalogosProducto;
  alCancelar: () => void;
  alEnviar: (datos: NuevoPedidoWeb) => Promise<void>;
  alCrearProducto: (datos: DatosProductoWeb) => Promise<ProductoPedido | null>;
  alCrearCategoriaProducto: (
    nombre: string,
  ) => Promise<CategoriaProducto | null>;
}) {
  const control = usarFormularioNuevoPedido();

  if (control.creandoProducto) {
    return (
      <div data-capacitacion="pedidos.nuevo.producto-formulario">
        <div className="mb-5 rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-950 dark:bg-blue-950/40 dark:text-blue-100">
          <strong className="block">
            {es ? "Registrar producto y regresar" : "Create product and return"}
          </strong>
          {es
            ? "Completa su ficha. Al guardarlo quedará seleccionado en el pedido."
            : "Complete the product record; it will be selected automatically."}
        </div>
        <FormularioProducto
          es={es}
          guardando={guardandoProducto}
          cancelar={cancelar}
          marcas={catalogosProducto.marcas}
          categorias={catalogosProducto.categorias}
          alCrearCategoria={alCrearCategoriaProducto}
          alCancelar={() => control.establecerCreandoProducto(false)}
          alGuardar={async (datos) => {
            const creado = await alCrearProducto(datos);
            if (!creado) return;
            control.establecerProducto(creado);
            control.establecerCreandoProducto(false);
          }}
        />
      </div>
    );
  }

  const puedeContinuar =
    control.paso === 1
      ? Boolean(control.cliente)
      : Boolean(control.producto && control.cantidadValida);
  return (
    <div data-capacitacion="pedidos.nuevo.formulario">
      <IndicadorPasosOperacion
        actual={control.paso}
        pasos={[
          {
            titulo: es ? "1. Cliente" : "1. Customer",
            descripcion: es ? "Quién lo solicitó" : "Who requested it",
          },
          {
            titulo: es ? "2. Producto" : "2. Product",
            descripcion: es ? "Qué y cuánto" : "What and how many",
          },
          {
            titulo: es ? "3. Revisar" : "3. Review",
            descripcion: es ? "Promesa y efectos" : "Promise and effects",
          },
        ]}
      />
      {control.paso === 1 && (
        <PasoClienteNuevoPedido control={control} es={es} />
      )}
      {control.paso === 2 && (
        <PasoProductoNuevoPedido
          control={control}
          es={es}
          puedeCrearProducto={puedeCrearProducto}
        />
      )}
      {control.paso === 3 && <ResumenNuevoPedido control={control} es={es} />}

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
              type="button"
              className="boton-primario"
              disabled={!puedeContinuar}
              onClick={control.siguiente}
              data-capacitacion={`pedidos.nuevo.continuar-${control.paso}`}
            >
              {es ? "Continuar" : "Continue"} <ChevronRight size={17} />
            </button>
          ) : (
            <button
              type="button"
              className="boton-primario"
              disabled={guardando || !control.cliente || !control.producto}
              onClick={() =>
                control.cliente &&
                control.producto &&
                void alEnviar({
                  clienteId: control.cliente.id,
                  productoId: control.producto.id,
                  cantidad: Number(control.cantidad),
                  ...(control.fechaCompromiso
                    ? { fechaCompromiso: control.fechaCompromiso }
                    : {}),
                })
              }
              data-capacitacion="pedidos.nuevo.guardar"
            >
              {guardando
                ? es
                  ? "Creando…"
                  : "Creating…"
                : es
                  ? "Crear pedido pendiente de proveedor"
                  : "Create pending order"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
