"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Boxes, Plus, Search, Trash2 } from "lucide-react";

import { usarAplicacion } from "@/componentes/proveedores";
import {
  EncabezadoPagina,
  EstadoVacio,
  MensajeError,
  Modal,
  Paginador,
} from "@/componentes/ui";
import { api, ErrorApi } from "@/lib/api";
import { usarDatosVivos } from "@/lib/usarDatosVivos";
import type { Pagina } from "@/lib/tipos";
import { FormularioProducto } from "@/modulos/inventario/FormularioProducto";
import { GuiaAlmacen } from "@/modulos/inventario/GuiaAlmacen";
import { TarjetaProducto } from "@/modulos/inventario/TarjetaProducto";
import type {
  CatalogosProducto,
  CategoriaProducto,
  DatosProductoWeb,
  ProductoInventario,
} from "@/modulos/inventario/tipos";
import { usarAccionInicial } from "@/lib/usarAccionInicial";

export default function PaginaInventario() {
  const { t, idioma, usuario } = usarAplicacion();
  const es = idioma === "es";
  const [respuesta, establecerRespuesta] =
    useState<Pagina<ProductoInventario> | null>(null);
  const [pagina, establecerPagina] = useState(1);
  const [buscar, establecerBuscar] = useState("");
  const [termino, establecerTermino] = useState("");
  const [nuevo, establecerNuevo] = useState(false);
  const [productoEditar, establecerProductoEditar] =
    useState<ProductoInventario | null>(null);
  const [ajuste, establecerAjuste] = useState<ProductoInventario | null>(null);
  const [productoBaja, establecerProductoBaja] =
    useState<ProductoInventario | null>(null);
  const [guardando, establecerGuardando] = useState(false);
  const [error, establecerError] = useState("");
  const [catalogos, establecerCatalogos] = useState<CatalogosProducto>({
    marcas: [],
    categorias: [],
  });
  const [categoriaId, establecerCategoriaId] = useState("");

  const puedeGestionar =
    usuario?.rol === "ADMINISTRADOR" || usuario?.rol === "ALMACENISTA";
  usarAccionInicial((accion) => {
    if (accion === "nuevo" && puedeGestionar) establecerNuevo(true);
  });
  const cargar = useCallback(() => {
    establecerError("");
    return api<Pagina<ProductoInventario>>(
      `/inventario/productos?pagina=${pagina}&limite=18&buscar=${encodeURIComponent(buscar)}${categoriaId ? `&categoriaId=${encodeURIComponent(categoriaId)}` : ""}`,
    )
      .then(establecerRespuesta)
      .catch((e) => establecerError(e.message));
  }, [pagina, buscar, categoriaId]);

  useEffect(() => void cargar(), [cargar]);
  useEffect(() => {
    void api<CatalogosProducto>("/inventario/catalogos-producto")
      .then(establecerCatalogos)
      .catch(() => undefined);
  }, []);
  usarDatosVivos(cargar);

  async function guardarProducto(datos: DatosProductoWeb) {
    establecerGuardando(true);
    establecerError("");
    try {
      if (productoEditar) {
        await api(`/inventario/productos/${productoEditar.id}`, {
          method: "PATCH",
          body: JSON.stringify(datos),
        });
        establecerProductoEditar(null);
      } else {
        await api("/inventario/productos", {
          method: "POST",
          body: JSON.stringify(datos),
        });
        establecerNuevo(false);
      }
      await cargar();
    } catch (e) {
      establecerError(
        e instanceof ErrorApi
          ? e.message
          : es
            ? "No fue posible guardar el producto."
            : "The product could not be saved.",
      );
    } finally {
      establecerGuardando(false);
    }
  }

  async function crearCategoria(nombre: string) {
    try {
      const categoria = await api<CategoriaProducto>(
        "/inventario/categorias-producto",
        { method: "POST", body: JSON.stringify({ nombre }) },
      );
      establecerCatalogos((actuales) => ({
        ...actuales,
        categorias: [
          ...actuales.categorias.filter((actual) => actual.id !== categoria.id),
          categoria,
        ].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
      }));
      return categoria;
    } catch (e) {
      establecerError(
        e instanceof ErrorApi
          ? e.message
          : es
            ? "No fue posible crear la agrupación."
            : "The group could not be created.",
      );
      return null;
    }
  }

  async function guardarAjuste(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!ajuste) return;
    establecerGuardando(true);
    const valores = Object.fromEntries(new FormData(evento.currentTarget));
    try {
      await api(`/inventario/productos/${ajuste.id}/ajuste`, {
        method: "POST",
        body: JSON.stringify(valores),
      });
      establecerAjuste(null);
      await cargar();
    } catch (e) {
      establecerError(
        e instanceof ErrorApi
          ? e.message
          : es
            ? "No fue posible ajustar la existencia."
            : "Stock could not be adjusted.",
      );
    } finally {
      establecerGuardando(false);
    }
  }

  async function darDeBaja() {
    if (!productoBaja) return;
    try {
      await api(`/inventario/productos/${productoBaja.id}`, {
        method: "DELETE",
      });
      establecerProductoBaja(null);
      await cargar();
    } catch (e) {
      establecerError(
        e instanceof ErrorApi
          ? e.message
          : es
            ? "No fue posible dar de baja el producto."
            : "The product could not be deactivated.",
      );
      establecerProductoBaja(null);
    }
  }

  return (
    <>
      <EncabezadoPagina
        titulo={t.inventario}
        descripcion={
          es
            ? "Productos visuales, existencias, precios y códigos en un solo lugar."
            : "Visual catalog, stock, prices, and codes in one place."
        }
        accion={
          puedeGestionar ? (
            <button
              className="boton-primario"
              onClick={() => establecerNuevo(true)}
              data-capacitacion="inventario.producto.abrir"
            >
              <Plus size={18} /> {es ? "Nuevo producto" : "New product"}
            </button>
          ) : undefined
        }
      />
      {error && <MensajeError mensaje={error} />}
      {puedeGestionar && <GuiaAlmacen es={es} />}

      <section
        className="panel mb-5 p-4"
        data-capacitacion="inventario.busqueda"
      >
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(evento) => {
            evento.preventDefault();
            establecerPagina(1);
            establecerBuscar(termino.trim());
          }}
        >
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-3 text-slate-400"
              size={18}
            />
            <input
              className="campo pl-10"
              data-capacitacion="inventario.busqueda.campo"
              value={termino}
              onChange={(evento) => establecerTermino(evento.target.value)}
              placeholder={
                es
                  ? "Producto, marca, SKU o código"
                  : "Product, brand, SKU, or code"
              }
            />
          </div>
          <button
            className="boton-secundario"
            data-capacitacion="inventario.busqueda.ejecutar"
          >
            {t.buscar}
          </button>
        </form>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            className={categoriaId ? "boton-secundario" : "boton-primario"}
            onClick={() => {
              establecerCategoriaId("");
              establecerPagina(1);
            }}
          >
            {es ? "Todos" : "All"}
          </button>
          {catalogos.categorias.map((categoria) => (
            <button
              key={categoria.id}
              type="button"
              className={
                categoriaId === categoria.id
                  ? "boton-primario"
                  : "boton-secundario"
              }
              onClick={() => {
                establecerCategoriaId(categoria.id);
                establecerPagina(1);
              }}
            >
              {categoria.nombre}
            </button>
          ))}
        </div>
      </section>

      {respuesta && respuesta.datos.length > 0 ? (
        <div
          className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3"
          data-capacitacion="inventario.lista"
        >
          {respuesta.datos.map((producto) => (
            <TarjetaProducto
              key={producto.id}
              producto={producto}
              es={es}
              puedeGestionar={puedeGestionar}
              alEditar={() => establecerProductoEditar(producto)}
              alAjustar={() => establecerAjuste(producto)}
              alDarDeBaja={() => establecerProductoBaja(producto)}
            />
          ))}
        </div>
      ) : respuesta ? (
        <div className="panel">
          <EstadoVacio
            texto={
              buscar
                ? es
                  ? "No encontramos productos con esa búsqueda."
                  : "No products matched that search."
                : es
                  ? "Aún no hay productos. Crea el primero para comenzar a vender."
                  : "There are no products yet. Create the first one to start selling."
            }
          />
        </div>
      ) : (
        <div className="panel grid min-h-48 place-items-center text-sm text-slate-500">
          <span>
            <Boxes className="mr-2 inline" size={18} />{" "}
            {es ? "Cargando inventario…" : "Loading inventory…"}
          </span>
        </div>
      )}

      {respuesta && respuesta.paginacion.totalPaginas > 1 && (
        <div className="panel mt-5">
          <Paginador
            pagina={respuesta.paginacion.pagina}
            totalPaginas={respuesta.paginacion.totalPaginas}
            cambiar={establecerPagina}
          />
        </div>
      )}

      <Modal
        abierto={nuevo}
        cerrar={() => establecerNuevo(false)}
        titulo={es ? "Nuevo producto" : "New product"}
        ancho="amplio"
      >
        <FormularioProducto
          es={es}
          guardando={guardando}
          cancelar={t.cancelar}
          marcas={catalogos.marcas}
          categorias={catalogos.categorias}
          alCrearCategoria={crearCategoria}
          alCancelar={() => establecerNuevo(false)}
          alGuardar={guardarProducto}
        />
      </Modal>

      <Modal
        abierto={Boolean(productoEditar)}
        cerrar={() => establecerProductoEditar(null)}
        titulo={`${es ? "Editar" : "Edit"} · ${productoEditar?.nombre ?? ""}`}
        ancho="amplio"
      >
        {productoEditar && (
          <FormularioProducto
            key={productoEditar.id}
            producto={productoEditar}
            es={es}
            guardando={guardando}
            cancelar={t.cancelar}
            marcas={catalogos.marcas}
            categorias={catalogos.categorias}
            alCrearCategoria={crearCategoria}
            alCancelar={() => establecerProductoEditar(null)}
            alGuardar={guardarProducto}
          />
        )}
      </Modal>

      <Modal
        abierto={Boolean(ajuste)}
        cerrar={() => establecerAjuste(null)}
        titulo={`${es ? "Ajustar existencia" : "Adjust stock"} · ${ajuste?.nombre ?? ""}`}
      >
        <form
          onSubmit={guardarAjuste}
          className="space-y-4"
          data-capacitacion="inventario.ajuste.formulario"
        >
          <div
            className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-100"
            data-capacitacion="inventario.ajuste.existencia-actual"
          >
            {es ? "Existencia actual" : "Current stock"}:{" "}
            <strong className="text-lg">{ajuste?.existencia}</strong>
          </div>
          <label>
            <span className="etiqueta">
              {es
                ? "Cantidad (+ entrada / − salida)"
                : "Quantity (+ in / − out)"}
            </span>
            <input
              name="cantidad"
              className="campo"
              data-capacitacion="inventario.ajuste.cantidad"
              type="number"
              required
              autoFocus
            />
          </label>
          <label>
            <span className="etiqueta">
              {es ? "Motivo obligatorio" : "Required reason"}
            </span>
            <textarea
              name="notas"
              className="campo min-h-24 py-3"
              data-capacitacion="inventario.ajuste.motivo"
              required
              minLength={3}
            />
          </label>
          <div
            className="flex justify-end gap-2"
            data-capacitacion="inventario.ajuste.revision"
          >
            <button
              type="button"
              className="boton-secundario"
              onClick={() => establecerAjuste(null)}
              data-capacitacion="inventario.ajuste.cancelar"
            >
              {t.cancelar}
            </button>
            <button
              className="boton-primario"
              disabled={guardando}
              data-capacitacion="inventario.ajuste.guardar"
            >
              {guardando
                ? es
                  ? "Guardando…"
                  : "Saving…"
                : es
                  ? "Aplicar ajuste"
                  : "Apply adjustment"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        abierto={Boolean(productoBaja)}
        cerrar={() => establecerProductoBaja(null)}
        titulo={es ? "Dar de baja producto" : "Deactivate product"}
      >
        <div
          className="space-y-4"
          data-capacitacion="inventario.baja.formulario"
        >
          <div
            className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
            data-capacitacion="inventario.baja.revision"
          >
            <strong className="block text-base">{productoBaja?.nombre}</strong>
            {es
              ? "Dejará de aparecer en ventas y pedidos nuevos. Las ventas realizadas conservarán nombre, marca, costo y precio históricos."
              : "It will no longer appear in new sales or orders. Existing sales keep the historical name, brand, cost, and price."}
          </div>
          <div className="flex justify-end gap-2">
            <button
              className="boton-secundario"
              onClick={() => establecerProductoBaja(null)}
              data-capacitacion="inventario.baja.cancelar"
            >
              {t.cancelar}
            </button>
            <button
              className="boton-primario bg-red-600 hover:bg-red-700"
              onClick={() => void darDeBaja()}
              data-capacitacion="inventario.baja.confirmar"
            >
              <Trash2 size={17} /> {es ? "Dar de baja" : "Deactivate"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
