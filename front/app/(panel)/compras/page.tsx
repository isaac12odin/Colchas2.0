"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, Plus, Search, ShoppingCart, Truck, X } from "lucide-react";
import { api, ErrorApi } from "@/lib/api";
import type { Pagina } from "@/lib/tipos";
import type { ProductoPedido } from "@/modulos/pedidos/tipos";
import { SelectorProductoRemoto } from "@/componentes/SelectoresRemotos";
import { EncabezadoPagina, EstadoVacio, MensajeError, Modal, Paginador } from "@/componentes/ui";
import { usarAplicacion } from "@/componentes/proveedores";

interface Proveedor {
  id: string;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  correo: string | null;
  rfc: string | null;
  notas: string | null;
  activo: boolean;
  _count: { compras: number; itemsPedido: number };
}

interface Compra {
  id: string;
  folio: string;
  proveedorNombre: string;
  total: string;
  fechaCompra: string;
  usuario: { nombre: string };
  detalles: Array<{
    id: string;
    cantidad: number;
    costoUnitario: string;
    total: string;
    producto: { nombre: string; sku: string };
    itemsPedido: Array<{ pedido: { folio: string } }>;
  }>;
}

interface PedidoPendiente {
  id: string;
  folio: string;
  items: Array<{
    id: string;
    producto: { id: string; nombre: string; sku: string } | null;
  }>;
}

interface Linea {
  id: string;
  producto: ProductoPedido | null;
  cantidad: string;
  costo: string;
  itemPedidoId: string;
}

const dinero = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const nuevaLinea = (): Linea => ({
  id: crypto.randomUUID(),
  producto: null,
  cantidad: "1",
  costo: "",
  itemPedidoId: "",
});

export default function PaginaCompras() {
  const { idioma } = usarAplicacion();
  const es = idioma === "es";
  const [pestana, establecerPestana] = useState<"compras" | "proveedores">("compras");
  const [pagina, establecerPagina] = useState(1);
  const [buscar, establecerBuscar] = useState("");
  const [compras, establecerCompras] = useState<Pagina<Compra> | null>(null);
  const [proveedores, establecerProveedores] = useState<Proveedor[]>([]);
  const [pedidos, establecerPedidos] = useState<PedidoPendiente[]>([]);
  const [modalCompra, establecerModalCompra] = useState(false);
  const [proveedorEditar, establecerProveedorEditar] = useState<Proveedor | "nuevo" | null>(null);
  const [proveedorId, establecerProveedorId] = useState("");
  const [lineas, establecerLineas] = useState<Linea[]>([nuevaLinea()]);
  const [error, establecerError] = useState("");

  const cargar = useCallback(() => {
    api<Pagina<Compra>>(`/compras?pagina=${pagina}&limite=15&buscar=${encodeURIComponent(buscar)}`)
      .then(establecerCompras)
      .catch((e) => establecerError(e.message));
    api<{ datos: Proveedor[] }>("/proveedores?incluirInactivos=true")
      .then((r) => {
        establecerProveedores(r.datos);
        establecerProveedorId((actual) => actual || r.datos.find((p) => p.activo)?.id || "");
      })
      .catch((e) => establecerError(e.message));
    api<{ datos: PedidoPendiente[] }>("/pedidos?estado=PEDIDO_PROVEEDOR")
      .then((r) => establecerPedidos(r.datos))
      .catch(() => undefined);
  }, [pagina, buscar]);
  useEffect(cargar, [cargar]);

  const total = useMemo(
    () => lineas.reduce((suma, linea) => suma + Number(linea.cantidad || 0) * Number(linea.costo || 0), 0),
    [lineas],
  );

  function cambiarLinea(id: string, cambios: Partial<Linea>) {
    establecerLineas((actuales) => actuales.map((linea) => (linea.id === id ? { ...linea, ...cambios } : linea)));
  }

  async function crearCompra(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = new FormData(evento.currentTarget);
    try {
      await api("/compras", {
        method: "POST",
        body: JSON.stringify({
          proveedorId,
          fechaCompra: new Date(String(formulario.get("fechaCompra"))).toISOString(),
          notas: formulario.get("notas") || undefined,
          items: lineas.map((linea) => ({
            productoId: linea.producto?.id,
            cantidad: Number(linea.cantidad),
            costoUnitario: Number(linea.costo),
            itemPedidoId: linea.itemPedidoId || undefined,
          })),
        }),
      });
      establecerModalCompra(false);
      establecerLineas([nuevaLinea()]);
      cargar();
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
    }
  }

  async function guardarProveedor(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const valores = Object.fromEntries(new FormData(evento.currentTarget));
    try {
      if (proveedorEditar === "nuevo")
        await api("/proveedores", { method: "POST", body: JSON.stringify(valores) });
      else if (proveedorEditar)
        await api(`/proveedores/${proveedorEditar.id}`, { method: "PATCH", body: JSON.stringify(valores) });
      establecerProveedorEditar(null);
      cargar();
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
    }
  }

  async function alternarProveedor(proveedor: Proveedor) {
    try {
      await api(`/proveedores/${proveedor.id}`, {
        method: "PATCH",
        body: JSON.stringify({ activo: !proveedor.activo }),
      });
      cargar();
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
    }
  }

  return (
    <>
      <EncabezadoPagina
        titulo={es ? "Compras y proveedores" : "Purchases and suppliers"}
        descripcion={es ? "Entradas de mercancía con costo, proveedor y vínculo al pedido que surtieron." : "Stock receipts with cost, supplier, and order traceability."}
        accion={<div className="flex gap-2"><button className="boton-secundario" onClick={() => { establecerPestana("proveedores"); establecerProveedorEditar("nuevo"); }}><Truck size={17} /> Proveedor</button><button className="boton-primario" onClick={() => establecerModalCompra(true)}><Plus size={17} /> Compra</button></div>}
      />
      {error && <MensajeError mensaje={error} />}
      <div className="mb-5 flex gap-2">
        <button className={pestana === "compras" ? "boton-primario" : "boton-secundario"} onClick={() => establecerPestana("compras")}>Compras</button>
        <button className={pestana === "proveedores" ? "boton-primario" : "boton-secundario"} onClick={() => establecerPestana("proveedores")}>Proveedores</button>
      </div>

      {pestana === "compras" ? (
        <section className="panel overflow-hidden">
          <form className="flex gap-2 border-b p-4" onSubmit={(e) => { e.preventDefault(); establecerPagina(1); cargar(); }}><div className="relative flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={18} /><input className="campo pl-10" value={buscar} onChange={(e) => establecerBuscar(e.target.value)} placeholder="Folio o proveedor" /></div><button className="boton-secundario">Buscar</button></form>
          <div className="divide-y">
            {compras?.datos.map((compra) => (
              <article key={compra.id} className="p-5">
                <div className="flex flex-wrap justify-between gap-3"><div><p className="font-mono text-xs text-slate-500">{compra.folio}</p><h2 className="font-semibold">{compra.proveedorNombre}</h2><p className="text-xs text-slate-500">{new Date(compra.fechaCompra).toLocaleString("es-MX")} · {compra.usuario.nombre}</p></div><strong className="text-lg">{dinero.format(Number(compra.total))}</strong></div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{compra.detalles.map((detalle) => <div key={detalle.id} className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-950"><strong>{detalle.cantidad} × {detalle.producto.nombre}</strong><p className="text-xs text-slate-500">{detalle.producto.sku} · {dinero.format(Number(detalle.costoUnitario))} c/u {detalle.itemsPedido[0] ? `· Surtió ${detalle.itemsPedido[0].pedido.folio}` : ""}</p></div>)}</div>
              </article>
            ))}
          </div>
          {compras?.datos.length === 0 && <EstadoVacio texto="No hay compras registradas." />}
          {compras && <Paginador pagina={compras.paginacion.pagina} totalPaginas={compras.paginacion.totalPaginas} cambiar={establecerPagina} />}
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {proveedores.map((proveedor) => <article key={proveedor.id} className={`panel p-5 ${proveedor.activo ? "" : "opacity-60"}`}><div className="flex justify-between gap-3"><div><h2 className="font-semibold">{proveedor.nombre}</h2><p className="text-xs text-slate-500">{proveedor.rfc || "Sin RFC"}</p></div><button className="boton-secundario px-3" onClick={() => establecerProveedorEditar(proveedor)}><Edit3 size={16} /></button></div><div className="mt-4 space-y-1 text-sm"><p>{proveedor.contacto || "Sin contacto"}</p><p>{proveedor.telefono || proveedor.correo || "Sin datos de contacto"}</p><p className="text-xs text-slate-500">{proveedor._count.compras} compras · {proveedor._count.itemsPedido} artículos surtidos</p></div><button className="mt-4 text-xs font-semibold text-blue-600" onClick={() => void alternarProveedor(proveedor)}>{proveedor.activo ? "Dar de baja" : "Reactivar"}</button></article>)}
        </section>
      )}

      <Modal abierto={modalCompra} cerrar={() => establecerModalCompra(false)} titulo="Registrar compra">
        <form onSubmit={crearCompra} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2"><label><span className="etiqueta">Proveedor</span><select className="campo" value={proveedorId} onChange={(e) => establecerProveedorId(e.target.value)} required><option value="">Seleccione</option>{proveedores.filter((p) => p.activo).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></label><label><span className="etiqueta">Fecha de compra</span><input name="fechaCompra" type="date" className="campo" defaultValue={new Date().toISOString().slice(0, 10)} required /></label></div>
          <div className="space-y-4">{lineas.map((linea, indice) => <div key={linea.id} className="rounded-xl border p-4"><div className="mb-3 flex justify-between"><strong>Artículo {indice + 1}</strong>{lineas.length > 1 && <button type="button" onClick={() => establecerLineas((a) => a.filter((l) => l.id !== linea.id))}><X size={18} /></button>}</div><SelectorProductoRemoto valor={linea.producto} alCambiar={(producto) => cambiarLinea(linea.id, { producto, costo: producto?.precioCompra ?? linea.costo, itemPedidoId: "" })} es={es} /><div className="mt-3 grid gap-3 sm:grid-cols-3"><label><span className="etiqueta">Cantidad</span><input className="campo" type="number" min="1" value={linea.cantidad} onChange={(e) => cambiarLinea(linea.id, { cantidad: e.target.value })} required /></label><label><span className="etiqueta">Costo unitario</span><input className="campo" type="number" min="0.01" step="0.01" value={linea.costo} onChange={(e) => cambiarLinea(linea.id, { costo: e.target.value })} required /></label><label><span className="etiqueta">Pedido relacionado</span><select className="campo" value={linea.itemPedidoId} onChange={(e) => cambiarLinea(linea.id, { itemPedidoId: e.target.value })}><option value="">Entrada general</option>{pedidos.flatMap((pedido) => pedido.items.filter((item) => item.producto?.id === linea.producto?.id).map((item) => <option key={item.id} value={item.id}>{pedido.folio}</option>))}</select></label></div></div>)}</div>
          <button type="button" className="boton-secundario" onClick={() => establecerLineas((a) => [...a, nuevaLinea()])}><Plus size={16} /> Otro artículo</button>
          <label><span className="etiqueta">Notas</span><textarea name="notas" className="campo min-h-20 py-3" /></label>
          <div className="flex items-center justify-between border-t pt-4"><strong>Total: {dinero.format(total)}</strong><div className="flex gap-2"><button type="button" className="boton-secundario" onClick={() => establecerModalCompra(false)}>Cancelar</button><button className="boton-primario" disabled={!proveedorId || lineas.some((l) => !l.producto)}>Registrar entrada</button></div></div>
        </form>
      </Modal>

      <Modal abierto={Boolean(proveedorEditar)} cerrar={() => establecerProveedorEditar(null)} titulo={proveedorEditar === "nuevo" ? "Nuevo proveedor" : "Editar proveedor"}>
        <form onSubmit={guardarProveedor} className="grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><span className="etiqueta">Nombre</span><input name="nombre" className="campo" defaultValue={proveedorEditar === "nuevo" ? "" : proveedorEditar?.nombre} required /></label><label><span className="etiqueta">Contacto</span><input name="contacto" className="campo" defaultValue={proveedorEditar === "nuevo" ? "" : proveedorEditar?.contacto ?? ""} /></label><label><span className="etiqueta">Teléfono</span><input name="telefono" className="campo" defaultValue={proveedorEditar === "nuevo" ? "" : proveedorEditar?.telefono ?? ""} /></label><label><span className="etiqueta">Correo</span><input name="correo" type="email" className="campo" defaultValue={proveedorEditar === "nuevo" ? "" : proveedorEditar?.correo ?? ""} /></label><label><span className="etiqueta">RFC</span><input name="rfc" className="campo" defaultValue={proveedorEditar === "nuevo" ? "" : proveedorEditar?.rfc ?? ""} /></label><label className="sm:col-span-2"><span className="etiqueta">Notas</span><textarea name="notas" className="campo min-h-20 py-3" defaultValue={proveedorEditar === "nuevo" ? "" : proveedorEditar?.notas ?? ""} /></label><div className="sm:col-span-2 flex justify-end gap-2"><button type="button" className="boton-secundario" onClick={() => establecerProveedorEditar(null)}>Cancelar</button><button className="boton-primario">Guardar</button></div></form>
      </Modal>
    </>
  );
}
