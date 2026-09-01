"use client";

import { Boxes, Plus, Search, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { usarAplicacion } from "@/componentes/proveedores";
import {
  EncabezadoPagina,
  EstadoVacio,
  MensajeError,
  Modal,
  Paginador,
} from "@/componentes/ui";
import { api, ErrorApi } from "@/lib/api";
import type { Pagina } from "@/lib/tipos";
import { usarAccionInicial } from "@/lib/usarAccionInicial";
import { usarDatosVivos } from "@/lib/usarDatosVivos";
import { FormularioProducto } from "@/modulos/inventario/FormularioProducto";
import { GuiaAlmacen } from "@/modulos/inventario/GuiaAlmacen";
import { TarjetaProducto } from "@/modulos/inventario/TarjetaProducto";
import type {
  CatalogosProducto,
  CategoriaProducto,
  DatosProductoWeb,
  ProductoInventario,
} from "@/modulos/inventario/tipos";

export default function PaginaInventario() {
  const parametros = useSearchParams();
  const { t, idioma, usuario } = usarAplicacion();
  const es = idioma === "es";
  const busquedaUrl = parametros.get("buscar") ?? "";
  const [respuesta, establecerRespuesta] =
    useState<Pagina<ProductoInventario> | null>(null);
  const [pagina, establecerPagina] = useState(1);
  const [buscar, establecerBuscar] = useState(busquedaUrl);
  const [termino, establecerTermino] = useState(busquedaUrl);
  const [nuevo, establecerNuevo] = useState(false);
  const [productoEditar, establecerProductoEditar] =
    useState<ProductoInventario | null>(null);
  const [ajuste, establecerAjuste] = useState<ProductoInventario | null>(null);
  const [productoBaja, establecerProductoBaja] =
    useState<ProductoInventario | null>(null);
  const [guardando, establecerGuardando] = useState(false);
  const [error, establecerError] = useState("");
  const [errorOperacion, establecerErrorOperacion] = useState("");
  const [tipoAjuste, establecerTipoAjuste] = useState<"AGREGAR" | "RETIRAR">(
    "AGREGAR",
  );
  const [cantidadAjuste, establecerCantidadAjuste] = useState("");
  const [motivoAjuste, establecerMotivoAjuste] = useState("");
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
  useEffect(() => {
    establecerTermino(busquedaUrl);
    establecerBuscar(busquedaUrl);
    establecerPagina(1);
  }, [busquedaUrl]);
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
    establecerErrorOperacion("");
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
      establecerErrorOperacion(
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
      establecerErrorOperacion(
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
    const cantidad = Number(cantidadAjuste);
    const delta = tipoAjuste === "AGREGAR" ? cantidad : -cantidad;
    if (
      !Number.isInteger(cantidad) ||
      cantidad <= 0 ||
      ajuste.existencia + delta < 0 ||
      motivoAjuste.trim().length < 3
    )
      return;
    establecerGuardando(true);
    establecerErrorOperacion("");
    try {
      await api(`/inventario/productos/${ajuste.id}/ajuste`, {
        method: "POST",
        body: JSON.stringify({ cantidad: delta, notas: motivoAjuste.trim() }),
      });
      establecerAjuste(null);
      establecerCantidadAjuste("");
      establecerMotivoAjuste("");
      await cargar();
    } catch (e) {
      establecerErrorOperacion(
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
    if (!productoBaja || guardando) return;
    establecerGuardando(true);
    establecerErrorOperacion("");
    try {
      await api(`/inventario/productos/${productoBaja.id}`, {
        method: "DELETE",
      });
      establecerProductoBaja(null);
      await cargar();
    } catch (e) {
      establecerErrorOperacion(
        e instanceof ErrorApi
          ? e.message
          : es
            ? "No fue posible dar de baja el producto."
            : "The product could not be deactivated.",
      );
    } finally {
      establecerGuardando(false);
    }
  }

  function abrirAjuste(producto: ProductoInventario) {
    establecerErrorOperacion("");
    establecerTipoAjuste("AGREGAR");
    establecerCantidadAjuste("");
    establecerMotivoAjuste("");
    establecerAjuste(producto);
  }

  const cantidadAjusteNumero = Number(cantidadAjuste || 0);
  const deltaAjuste =
    tipoAjuste === "AGREGAR" ? cantidadAjusteNumero : -cantidadAjusteNumero;
  const existenciaDespuesAjuste = (ajuste?.existencia ?? 0) + deltaAjuste;
  const ajusteValido =
    Number.isInteger(cantidadAjusteNumero) &&
    cantidadAjusteNumero > 0 &&
    existenciaDespuesAjuste >= 0 &&
    motivoAjuste.trim().length >= 3;

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
              onClick={() => {
                establecerErrorOperacion("");
                establecerNuevo(true);
              }}
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
              alEditar={() => {
                establecerErrorOperacion("");
                establecerProductoEditar(producto);
              }}
              alAjustar={() => abrirAjuste(producto)}
              alDarDeBaja={() => {
                establecerErrorOperacion("");
                establecerProductoBaja(producto);
              }}
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
        {errorOperacion && <MensajeError mensaje={errorOperacion} />}
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
        {errorOperacion && <MensajeError mensaje={errorOperacion} />}
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
        {errorOperacion && <MensajeError mensaje={errorOperacion} />}
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
          <fieldset>
            <legend className="etiqueta">
              {es ? "¿Qué necesitas hacer?" : "What do you need to do?"}
            </legend>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={
                  tipoAjuste === "AGREGAR"
                    ? "boton-primario justify-center"
                    : "boton-secundario justify-center"
                }
                aria-pressed={tipoAjuste === "AGREGAR"}
                onClick={() => establecerTipoAjuste("AGREGAR")}
              >
                {es ? "Agregar" : "Add"}
              </button>
              <button
                type="button"
                className={
                  tipoAjuste === "RETIRAR"
                    ? "boton-primario justify-center"
                    : "boton-secundario justify-center"
                }
                aria-pressed={tipoAjuste === "RETIRAR"}
                onClick={() => establecerTipoAjuste("RETIRAR")}
              >
                {es ? "Retirar" : "Remove"}
              </button>
            </div>
          </fieldset>
          <label>
            <span className="etiqueta">{es ? "Piezas" : "Units"}</span>
            <input
              className="campo"
              data-capacitacion="inventario.ajuste.cantidad"
              type="number"
              min="1"
              step="1"
              value={cantidadAjuste}
              onChange={(evento) =>
                establecerCantidadAjuste(evento.target.value)
              }
              required
              autoFocus
            />
          </label>
          <label>
            <span className="etiqueta">
              {es ? "Motivo obligatorio" : "Required reason"}
            </span>
            <textarea
              className="campo min-h-24 py-3"
              data-capacitacion="inventario.ajuste.motivo"
              value={motivoAjuste}
              onChange={(evento) => establecerMotivoAjuste(evento.target.value)}
              required
              minLength={3}
            />
          </label>
          <div
            className={`rounded-xl border p-4 text-sm ${
              existenciaDespuesAjuste < 0
                ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100"
                : "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100"
            }`}
            aria-live="polite"
          >
            <span>{es ? "Existencia después" : "Stock after change"}</span>
            <strong className="ml-2 text-lg">
              {ajuste?.existencia ?? 0} → {existenciaDespuesAjuste}
            </strong>
            {existenciaDespuesAjuste < 0 && (
              <p className="mt-1 text-xs font-semibold">
                {es
                  ? "No puedes retirar más piezas de las existentes."
                  : "You cannot remove more units than are in stock."}
              </p>
            )}
          </div>
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
              disabled={guardando || !ajusteValido}
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
        {errorOperacion && <MensajeError mensaje={errorOperacion} />}
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
              disabled={guardando}
              data-capacitacion="inventario.baja.confirmar"
            >
              <Trash2 size={17} />{" "}
              {guardando
                ? es
                  ? "Dando de baja…"
                  : "Deactivating…"
                : es
                  ? "Confirmar baja"
                  : "Confirm deactivation"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
