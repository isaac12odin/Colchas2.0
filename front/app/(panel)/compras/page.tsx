"use client";

import { Edit3, Plus, Search, Truck } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
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
import { FormularioCompra } from "@/modulos/compras/FormularioCompra";
import type {
  NuevaCompraWeb,
  PedidoPendienteCompra,
} from "@/modulos/compras/tipos";

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

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});
export default function PaginaCompras() {
  const { idioma } = usarAplicacion();
  const es = idioma === "es";
  const [pestana, establecerPestana] = useState<"compras" | "proveedores">(
    "compras",
  );
  const [pagina, establecerPagina] = useState(1);
  const [buscar, establecerBuscar] = useState("");
  const [compras, establecerCompras] = useState<Pagina<Compra> | null>(null);
  const [proveedores, establecerProveedores] = useState<Proveedor[]>([]);
  const [pedidos, establecerPedidos] = useState<PedidoPendienteCompra[]>([]);
  const [modalCompra, establecerModalCompra] = useState(false);
  const [proveedorEditar, establecerProveedorEditar] = useState<
    Proveedor | "nuevo" | null
  >(null);
  const [guardandoCompra, establecerGuardandoCompra] = useState(false);
  const [error, establecerError] = useState("");
  usarAccionInicial((accion) => {
    if (accion === "nueva") establecerModalCompra(true);
    if (accion === "proveedor") {
      establecerPestana("proveedores");
      establecerProveedorEditar("nuevo");
    }
  });

  const cargar = useCallback(() => {
    api<Pagina<Compra>>(
      `/compras?pagina=${pagina}&limite=15&buscar=${encodeURIComponent(buscar)}`,
    )
      .then(establecerCompras)
      .catch((e) => establecerError(e.message));
    api<{ datos: Proveedor[] }>("/proveedores?incluirInactivos=true")
      .then((r) => {
        establecerProveedores(r.datos);
      })
      .catch((e) => establecerError(e.message));
    api<{ datos: PedidoPendienteCompra[] }>("/pedidos?estado=PEDIDO_PROVEEDOR")
      .then((r) => establecerPedidos(r.datos))
      .catch(() => undefined);
  }, [pagina, buscar]);
  useEffect(cargar, [cargar]);
  usarDatosVivos(cargar);

  async function crearCompra(datos: NuevaCompraWeb) {
    establecerGuardandoCompra(true);
    try {
      await api("/compras", {
        method: "POST",
        body: JSON.stringify(datos),
      });
      establecerModalCompra(false);
      cargar();
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
    } finally {
      establecerGuardandoCompra(false);
    }
  }

  async function guardarProveedor(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const valores = Object.fromEntries(new FormData(evento.currentTarget));
    try {
      if (proveedorEditar === "nuevo")
        await api("/proveedores", {
          method: "POST",
          body: JSON.stringify(valores),
        });
      else if (proveedorEditar)
        await api(`/proveedores/${proveedorEditar.id}`, {
          method: "PATCH",
          body: JSON.stringify(valores),
        });
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
        descripcion={
          es
            ? "Entradas de mercancía con costo, proveedor y vínculo al pedido que surtieron."
            : "Stock receipts with cost, supplier, and order traceability."
        }
        accion={
          <div className="flex gap-2">
            <button
              className="boton-secundario"
              onClick={() => {
                establecerPestana("proveedores");
                establecerProveedorEditar("nuevo");
              }}
              data-capacitacion="compras.proveedor.abrir-nuevo"
            >
              <Truck size={17} /> {es ? "Nuevo proveedor" : "New supplier"}
            </button>
            <button
              className="boton-primario"
              onClick={() => {
                establecerError("");
                establecerModalCompra(true);
              }}
              data-capacitacion="compras.compra.abrir-nueva"
            >
              <Plus size={17} />
              {es ? "Registrar entrada" : "Record receipt"}
            </button>
          </div>
        }
      />
      {error && <MensajeError mensaje={error} />}
      <div className="mb-5 flex gap-2">
        <button
          className={
            pestana === "compras" ? "boton-primario" : "boton-secundario"
          }
          onClick={() => establecerPestana("compras")}
          data-capacitacion="compras.pestana.compras"
        >
          Compras
        </button>
        <button
          className={
            pestana === "proveedores" ? "boton-primario" : "boton-secundario"
          }
          onClick={() => establecerPestana("proveedores")}
          data-capacitacion="compras.pestana.proveedores"
        >
          Proveedores
        </button>
      </div>

      {pestana === "compras" ? (
        <section
          className="panel overflow-hidden"
          data-capacitacion="compras.listado"
        >
          <form
            className="flex gap-2 border-b p-4"
            onSubmit={(e) => {
              e.preventDefault();
              establecerPagina(1);
              cargar();
            }}
          >
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-3 text-slate-400"
                size={18}
              />
              <input
                className="campo pl-10"
                value={buscar}
                onChange={(e) => establecerBuscar(e.target.value)}
                placeholder="Folio o proveedor"
                data-capacitacion="compras.buscar.campo"
              />
            </div>
            <button
              className="boton-secundario"
              data-capacitacion="compras.buscar.ejecutar"
            >
              Buscar
            </button>
          </form>
          <div className="divide-y">
            {compras?.datos.map((compra) => (
              <article
                key={compra.id}
                className="p-5"
                data-capacitacion="compras.compra.registro"
              >
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-slate-500">
                      {compra.folio}
                    </p>
                    <h2 className="font-semibold">{compra.proveedorNombre}</h2>
                    <p className="text-xs text-slate-500">
                      {new Date(compra.fechaCompra).toLocaleString("es-MX")} ·{" "}
                      {compra.usuario.nombre}
                    </p>
                  </div>
                  <strong className="text-lg">
                    {dinero.format(Number(compra.total))}
                  </strong>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {compra.detalles.map((detalle) => (
                    <div
                      key={detalle.id}
                      className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-950"
                    >
                      <strong>
                        {detalle.cantidad} × {detalle.producto.nombre}
                      </strong>
                      <p className="text-xs text-slate-500">
                        {detalle.producto.sku} ·{" "}
                        {dinero.format(Number(detalle.costoUnitario))} c/u{" "}
                        {detalle.itemsPedido[0]
                          ? `· Surtió ${detalle.itemsPedido[0].pedido.folio}`
                          : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
          {compras?.datos.length === 0 && (
            <EstadoVacio texto="No hay compras registradas." />
          )}
          {compras && (
            <Paginador
              pagina={compras.paginacion.pagina}
              totalPaginas={compras.paginacion.totalPaginas}
              cambiar={establecerPagina}
            />
          )}
        </section>
      ) : (
        <section
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
          data-capacitacion="compras.proveedor.listado"
        >
          {proveedores.map((proveedor) => (
            <article
              key={proveedor.id}
              className={`panel p-5 ${proveedor.activo ? "" : "opacity-60"}`}
              data-capacitacion="compras.proveedor.registro"
            >
              <div className="flex justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{proveedor.nombre}</h2>
                  <p className="text-xs text-slate-500">
                    {proveedor.rfc || "Sin RFC"}
                  </p>
                </div>
                <button
                  className="boton-secundario px-3"
                  onClick={() => establecerProveedorEditar(proveedor)}
                  data-capacitacion="compras.proveedor.editar"
                >
                  <Edit3 size={16} />
                </button>
              </div>
              <div className="mt-4 space-y-1 text-sm">
                <p>{proveedor.contacto || "Sin contacto"}</p>
                <p>
                  {proveedor.telefono ||
                    proveedor.correo ||
                    "Sin datos de contacto"}
                </p>
                <p className="text-xs text-slate-500">
                  {proveedor._count.compras} compras ·{" "}
                  {proveedor._count.itemsPedido} artículos surtidos
                </p>
              </div>
              <button
                className="mt-4 text-xs font-semibold text-blue-600"
                onClick={() => void alternarProveedor(proveedor)}
                data-capacitacion="compras.proveedor.estado"
              >
                {proveedor.activo ? "Dar de baja" : "Reactivar"}
              </button>
            </article>
          ))}
        </section>
      )}

      <Modal
        abierto={modalCompra}
        cerrar={() => establecerModalCompra(false)}
        titulo={es ? "Entrada de mercancía" : "Goods receipt"}
        ancho="amplio"
      >
        {error && <MensajeError mensaje={error} />}
        <FormularioCompra
          proveedores={proveedores}
          pedidos={pedidos}
          es={es}
          guardando={guardandoCompra}
          alCancelar={() => establecerModalCompra(false)}
          alGuardar={crearCompra}
        />
      </Modal>

      <Modal
        abierto={Boolean(proveedorEditar)}
        cerrar={() => establecerProveedorEditar(null)}
        titulo={
          proveedorEditar === "nuevo" ? "Nuevo proveedor" : "Editar proveedor"
        }
      >
        <form
          onSubmit={guardarProveedor}
          className="grid gap-4 sm:grid-cols-2"
          data-capacitacion="compras.proveedor.formulario"
        >
          <label className="sm:col-span-2">
            <span className="etiqueta">Nombre</span>
            <input
              name="nombre"
              className="campo"
              defaultValue={
                proveedorEditar === "nuevo" ? "" : proveedorEditar?.nombre
              }
              required
              data-capacitacion="compras.proveedor.nombre"
            />
          </label>
          <label>
            <span className="etiqueta">Contacto</span>
            <input
              name="contacto"
              className="campo"
              defaultValue={
                proveedorEditar === "nuevo"
                  ? ""
                  : (proveedorEditar?.contacto ?? "")
              }
              data-capacitacion="compras.proveedor.contacto"
            />
          </label>
          <label>
            <span className="etiqueta">Teléfono</span>
            <input
              name="telefono"
              className="campo"
              defaultValue={
                proveedorEditar === "nuevo"
                  ? ""
                  : (proveedorEditar?.telefono ?? "")
              }
              data-capacitacion="compras.proveedor.telefono"
            />
          </label>
          <label>
            <span className="etiqueta">Correo</span>
            <input
              name="correo"
              type="email"
              className="campo"
              defaultValue={
                proveedorEditar === "nuevo"
                  ? ""
                  : (proveedorEditar?.correo ?? "")
              }
              data-capacitacion="compras.proveedor.correo"
            />
          </label>
          <label>
            <span className="etiqueta">RFC</span>
            <input
              name="rfc"
              className="campo"
              defaultValue={
                proveedorEditar === "nuevo" ? "" : (proveedorEditar?.rfc ?? "")
              }
              data-capacitacion="compras.proveedor.rfc"
            />
          </label>
          <label className="sm:col-span-2">
            <span className="etiqueta">Notas</span>
            <textarea
              name="notas"
              className="campo min-h-20 py-3"
              defaultValue={
                proveedorEditar === "nuevo"
                  ? ""
                  : (proveedorEditar?.notas ?? "")
              }
              data-capacitacion="compras.proveedor.notas"
            />
          </label>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button
              type="button"
              className="boton-secundario"
              onClick={() => establecerProveedorEditar(null)}
            >
              Cancelar
            </button>
            <button
              className="boton-primario"
              data-capacitacion="compras.proveedor.guardar"
            >
              Guardar
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
