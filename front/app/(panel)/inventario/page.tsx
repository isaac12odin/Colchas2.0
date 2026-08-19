"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AlertTriangle, Barcode, Edit3, Plus, Search, Trash2 } from "lucide-react";
import { api, ErrorApi } from "@/lib/api";
import type { Pagina } from "@/lib/tipos";
import {
  EncabezadoPagina,
  EstadoVacio,
  MensajeError,
  Modal,
  Paginador,
} from "@/componentes/ui";
import { usarAplicacion } from "@/componentes/proveedores";

interface Producto {
  id: string;
  sku: string;
  nombre: string;
  marca: string;
  codigoBarras: string | null;
  codigoQr: string | null;
  categoria: string | null;
  existencia: number;
  existenciaMinima: number;
  precioVenta: string;
  precioCompra: string;
  activo: boolean;
}
const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export default function PaginaInventario() {
  const { t, idioma, usuario } = usarAplicacion();
  const [respuesta, establecerRespuesta] = useState<Pagina<Producto> | null>(
    null,
  );
  const [pagina, establecerPagina] = useState(1);
  const [buscar, establecerBuscar] = useState("");
  const [modal, establecerModal] = useState(false);
  const [ajuste, establecerAjuste] = useState<Producto | null>(null);
  const [productoEditar, establecerProductoEditar] = useState<Producto | null>(null);
  const [productoBaja, establecerProductoBaja] = useState<Producto | null>(
    null,
  );
  const [error, establecerError] = useState("");
  const es = idioma === "es";
  const puedeGestionar =
    usuario?.rol === "ADMINISTRADOR" || usuario?.rol === "ALMACENISTA";
  const cargar = useCallback(
    () =>
      api<Pagina<Producto>>(
        `/inventario/productos?pagina=${pagina}&limite=20&buscar=${encodeURIComponent(buscar)}`,
      )
        .then(establecerRespuesta)
        .catch((e) => establecerError(e.message)),
    [pagina, buscar],
  );
  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function crear(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const valores = Object.fromEntries(new FormData(evento.currentTarget));
    try {
      await api("/inventario/productos", {
        method: "POST",
        body: JSON.stringify(valores),
      });
      establecerModal(false);
      cargar();
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
    }
  }
  async function guardarAjuste(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!ajuste) return;
    const valores = Object.fromEntries(new FormData(evento.currentTarget));
    try {
      await api(`/inventario/productos/${ajuste.id}/ajuste`, {
        method: "POST",
        body: JSON.stringify(valores),
      });
      establecerAjuste(null);
      cargar();
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
    }
  }
  async function guardarProducto(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!productoEditar) return;
    const formulario = new FormData(evento.currentTarget);
    try {
      await api(`/inventario/productos/${productoEditar.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          sku: formulario.get("sku"),
          nombre: formulario.get("nombre"),
          marca: formulario.get("marca"),
          categoria: formulario.get("categoria") || undefined,
          codigoBarras: formulario.get("codigoBarras") || null,
          codigoQr: formulario.get("codigoQr") || null,
          existenciaMinima: Number(formulario.get("existenciaMinima")),
          precioCompra: Number(formulario.get("precioCompra")),
          precioVenta: Number(formulario.get("precioVenta")),
        }),
      });
      establecerProductoEditar(null);
      cargar();
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
    }
  }
  async function darDeBaja() {
    if (!productoBaja) return;
    try {
      await api(`/inventario/productos/${productoBaja.id}`, {
        method: "DELETE",
      });
      establecerProductoBaja(null);
      cargar();
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
      establecerProductoBaja(null);
    }
  }

  return (
    <>
      <EncabezadoPagina
        titulo={t.inventario}
        descripcion={
          es
            ? "Existencias, costos, precios y códigos de escaneo."
            : "Stock, costs, prices, and scannable codes."
        }
        accion={
          puedeGestionar ? (
            <button
              className="boton-primario"
              onClick={() => establecerModal(true)}
            >
              <Plus size={18} />
              {es ? "Producto" : "Product"}
            </button>
          ) : undefined
        }
      />
      {error && <MensajeError mensaje={error} />}
      <div className="panel overflow-hidden">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            establecerPagina(1);
            cargar();
          }}
          className="flex gap-2 border-b p-4"
        >
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-3 text-slate-400"
            />
            <input
              className="campo pl-10"
              value={buscar}
              onChange={(e) => establecerBuscar(e.target.value)}
              placeholder={
                es
                  ? "SKU, producto, marca o código"
                  : "SKU, product, brand, or code"
              }
            />
          </div>
          <button className="boton-secundario">{t.buscar}</button>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950">
              <tr>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">{es ? "Producto" : "Product"}</th>
                <th className="px-4 py-3">{es ? "Código" : "Code"}</th>
                <th className="px-4 py-3 text-right">
                  {es ? "Existencia" : "Stock"}
                </th>
                <th className="px-4 py-3 text-right">
                  {es ? "Compra" : "Cost"}
                </th>
                <th className="px-4 py-3 text-right">
                  {es ? "Venta" : "Price"}
                </th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y">
              {respuesta?.datos.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{p.nombre}</p>
                    <p className="text-xs text-slate-500">{p.marca}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs">
                      <Barcode size={15} />
                      {p.codigoBarras ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={
                        p.existencia <= p.existenciaMinima
                          ? "font-bold text-red-600"
                          : "font-semibold"
                      }
                    >
                      {p.existencia}
                    </span>
                    {p.existencia <= p.existenciaMinima && (
                      <AlertTriangle className="ml-2 inline" size={15} />
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {dinero.format(Number(p.precioCompra))}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {dinero.format(Number(p.precioVenta))}
                  </td>
                  <td className="px-4 py-3">
                    {puedeGestionar && (
                      <div className="flex justify-end gap-2">
                        <button
                          className="boton-secundario px-3"
                          onClick={() => establecerProductoEditar(p)}
                          title={es ? "Editar producto" : "Edit product"}
                        >
                          <Edit3 size={17} />
                        </button>
                        <button
                          className="boton-secundario"
                          onClick={() => establecerAjuste(p)}
                        >
                          {es ? "Ajustar" : "Adjust"}
                        </button>
                        <button
                          className="boton-secundario px-3 text-red-600"
                          onClick={() => establecerProductoBaja(p)}
                          title={es ? "Dar de baja" : "Deactivate"}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {respuesta?.datos.length === 0 && (
          <EstadoVacio texto={es ? "No hay productos." : "No products."} />
        )}
        {respuesta && (
          <Paginador
            pagina={respuesta.paginacion.pagina}
            totalPaginas={respuesta.paginacion.totalPaginas}
            cambiar={establecerPagina}
          />
        )}
      </div>
      <Modal
        abierto={modal}
        cerrar={() => establecerModal(false)}
        titulo={es ? "Nuevo producto" : "New product"}
      >
        <form onSubmit={crear} className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="etiqueta">SKU</span>
            <input name="sku" className="campo" required />
          </label>
          <label>
            <span className="etiqueta">{es ? "Marca" : "Brand"}</span>
            <input name="marca" className="campo" required />
          </label>
          <label className="sm:col-span-2">
            <span className="etiqueta">
              {es ? "Nombre del producto" : "Product name"}
            </span>
            <input name="nombre" className="campo" required />
          </label>
          <label>
            <span className="etiqueta">
              {es ? "Código de barras" : "Barcode"}
            </span>
            <input name="codigoBarras" className="campo" />
          </label>
          <label>
            <span className="etiqueta">{es ? "Código QR" : "QR code"}</span>
            <input name="codigoQr" className="campo" />
          </label>
          <label>
            <span className="etiqueta">{es ? "Precio compra" : "Cost"}</span>
            <input
              name="precioCompra"
              className="campo"
              type="number"
              min="0"
              step="0.01"
              required
            />
          </label>
          <label>
            <span className="etiqueta">
              {es ? "Precio venta" : "Sale price"}
            </span>
            <input
              name="precioVenta"
              className="campo"
              type="number"
              min="0.01"
              step="0.01"
              required
            />
          </label>
          <label>
            <span className="etiqueta">
              {es ? "Existencia inicial" : "Initial stock"}
            </span>
            <input
              name="existenciaInicial"
              className="campo"
              type="number"
              min="0"
              defaultValue="0"
            />
          </label>
          <label>
            <span className="etiqueta">
              {es ? "Existencia mínima" : "Minimum stock"}
            </span>
            <input
              name="existenciaMinima"
              className="campo"
              type="number"
              min="0"
              defaultValue="0"
            />
          </label>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button
              type="button"
              className="boton-secundario"
              onClick={() => establecerModal(false)}
            >
              {t.cancelar}
            </button>
            <button className="boton-primario">{t.guardar}</button>
          </div>
        </form>
      </Modal>
      <Modal
        abierto={Boolean(productoEditar)}
        cerrar={() => establecerProductoEditar(null)}
        titulo={`${es ? "Editar producto" : "Edit product"} · ${productoEditar?.nombre ?? ""}`}
      >
        {productoEditar && (
          <form onSubmit={guardarProducto} className="grid gap-4 sm:grid-cols-2">
            <label><span className="etiqueta">SKU</span><input name="sku" className="campo" defaultValue={productoEditar.sku} required /></label>
            <label><span className="etiqueta">Marca</span><input name="marca" className="campo" defaultValue={productoEditar.marca} required /></label>
            <label className="sm:col-span-2"><span className="etiqueta">Nombre</span><input name="nombre" className="campo" defaultValue={productoEditar.nombre} required /></label>
            <label><span className="etiqueta">Categoría</span><input name="categoria" className="campo" defaultValue={productoEditar.categoria ?? ""} /></label>
            <label><span className="etiqueta">Existencia mínima</span><input name="existenciaMinima" className="campo" type="number" min="0" defaultValue={productoEditar.existenciaMinima} required /></label>
            <label><span className="etiqueta">Código de barras</span><input name="codigoBarras" className="campo" defaultValue={productoEditar.codigoBarras ?? ""} /></label>
            <label><span className="etiqueta">Código QR</span><input name="codigoQr" className="campo" defaultValue={productoEditar.codigoQr ?? ""} /></label>
            <label><span className="etiqueta">Precio compra</span><input name="precioCompra" className="campo" type="number" min="0" step="0.01" defaultValue={productoEditar.precioCompra} required /></label>
            <label><span className="etiqueta">Precio venta</span><input name="precioVenta" className="campo" type="number" min="0.01" step="0.01" defaultValue={productoEditar.precioVenta} required /></label>
            <p className="sm:col-span-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-950">La existencia se modifica únicamente con Ajustar o Compras para conservar su historial.</p>
            <div className="sm:col-span-2 flex justify-end gap-2"><button type="button" className="boton-secundario" onClick={() => establecerProductoEditar(null)}>Cancelar</button><button className="boton-primario">Guardar cambios</button></div>
          </form>
        )}
      </Modal>
      <Modal
        abierto={Boolean(productoBaja)}
        cerrar={() => establecerProductoBaja(null)}
        titulo={es ? "Dar de baja producto" : "Deactivate product"}
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
            <strong className="block">{productoBaja?.nombre}</strong>
            <p className="mt-2 leading-6">
              {es
                ? "Dejará de aparecer en inventario, ventas y pedidos nuevos. Las ventas realizadas conservarán su nombre, SKU, marca, costo y precio originales."
                : "It will disappear from inventory, new sales, and new orders. Completed sales retain the original name, SKU, brand, cost, and price."}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              className="boton-secundario"
              onClick={() => establecerProductoBaja(null)}
            >
              {t.cancelar}
            </button>
            <button
              className="boton-primario bg-red-600 hover:bg-red-700"
              onClick={() => void darDeBaja()}
            >
              <Trash2 size={17} />
              {es ? "Dar de baja" : "Deactivate"}
            </button>
          </div>
        </div>
      </Modal>
      <Modal
        abierto={Boolean(ajuste)}
        cerrar={() => establecerAjuste(null)}
        titulo={`${es ? "Ajustar existencia" : "Adjust stock"} · ${ajuste?.nombre ?? ""}`}
      >
        <form onSubmit={guardarAjuste} className="space-y-4">
          <p className="rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-950">
            {es ? "Existencia actual" : "Current stock"}:{" "}
            <strong>{ajuste?.existencia}</strong>
          </p>
          <label>
            <span className="etiqueta">
              {es
                ? "Cantidad (+ entrada / − salida)"
                : "Quantity (+ in / − out)"}
            </span>
            <input name="cantidad" className="campo" type="number" required />
          </label>
          <label>
            <span className="etiqueta">
              {es ? "Motivo obligatorio" : "Required reason"}
            </span>
            <textarea
              name="notas"
              className="campo min-h-24 py-3"
              required
              minLength={3}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="boton-secundario"
              onClick={() => establecerAjuste(null)}
            >
              {t.cancelar}
            </button>
            <button className="boton-primario">{t.guardar}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
