"use client";

import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { usarAplicacion } from "@/componentes/proveedores";
import {
  EncabezadoPagina,
  EstadoVacio,
  MensajeError,
  Modal,
  Paginador,
} from "@/componentes/ui";
import { usarAccionInicial } from "@/lib/usarAccionInicial";
import { ConfirmarAvancePedido } from "@/modulos/pedidos/ConfirmarAvancePedido";
import { FiltrosPedidos } from "@/modulos/pedidos/FiltrosPedidos";
import { FormularioEntregaPedido } from "@/modulos/pedidos/FormularioEntregaPedido";
import { FormularioGestionPedido } from "@/modulos/pedidos/FormularioGestionPedido";
import { FormularioNuevoPedido } from "@/modulos/pedidos/FormularioNuevoPedido";
import { GuiaEstadosPedido } from "@/modulos/pedidos/GuiaEstadosPedido";
import { TarjetaPedidoWeb } from "@/modulos/pedidos/TarjetaPedidoWeb";
import { usarPedidosWeb } from "@/modulos/pedidos/usarPedidosWeb";

export default function PaginaPedidos() {
  const { t, idioma, usuario } = usarAplicacion();
  const es = idioma === "es";
  const puedeCrear = [
    "ADMINISTRADOR",
    "CONTABLE",
    "VENDEDOR",
    "COBRADOR",
  ].includes(usuario?.rol ?? "");
  const [pedidoDestacado, establecerPedidoDestacado] = useState("");
  const control = usarPedidosWeb(pedidoDestacado);
  const puedeAlmacen =
    usuario?.rol === "ADMINISTRADOR" || usuario?.rol === "ALMACENISTA";
  const puedeAsignarProveedor = [
    "ADMINISTRADOR",
    "CONTABLE",
    "ALMACENISTA",
  ].includes(usuario?.rol ?? "");
  const puedeEntregar =
    usuario?.rol === "ADMINISTRADOR" || usuario?.rol === "COBRADOR";
  const puedeCrearProducto = usuario?.rol === "ADMINISTRADOR";
  const puedeCrearProveedor =
    usuario?.rol === "ADMINISTRADOR" || usuario?.rol === "ALMACENISTA";
  const pedidoAbierto = useRef("");
  usarAccionInicial((accion) => {
    if (accion === "nuevo" && puedeCrear) control.abrirModal();
    if (accion === "gestionar") {
      establecerPedidoDestacado(
        new URL(window.location.href).searchParams.get("pedido") ?? "",
      );
    }
  });
  useEffect(() => {
    if (!pedidoDestacado || pedidoAbierto.current === pedidoDestacado) return;
    const pedido = control.pedidos.find(
      (actual) => actual.id === pedidoDestacado,
    );
    if (!pedido) return;
    pedidoAbierto.current = pedidoDestacado;
    if (pedido.estado === "PENDIENTE_PEDIR" && puedeAsignarProveedor) {
      control.abrirGestion(pedido);
    } else if (
      ["PEDIDO_PROVEEDOR", "RECIBIDO_ALMACEN"].includes(pedido.estado) &&
      puedeAlmacen
    ) {
      control.abrirAvance(pedido);
    } else if (pedido.estado === "LISTO_ENTREGA" && puedeEntregar) {
      control.abrirEntrega(pedido);
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("pedido");
    window.history.replaceState(window.history.state, "", url.pathname);
    establecerPedidoDestacado("");
  }, [
    pedidoDestacado,
    control,
    puedeAsignarProveedor,
    puedeAlmacen,
    puedeEntregar,
  ]);

  return (
    <>
      <EncabezadoPagina
        titulo={t.pedidos}
        descripcion={
          es
            ? "Seguimiento desde la solicitud hasta la entrega y generación de venta."
            : "Track every request through delivery and sale creation."
        }
        accion={
          puedeCrear ? (
            <button
              className="boton-primario"
              onClick={control.abrirModal}
              data-capacitacion="pedidos.nuevo.abrir"
            >
              <Plus size={18} />
              {es ? "Nuevo pedido" : "New order"}
            </button>
          ) : undefined
        }
      />
      {control.error && <MensajeError mensaje={control.error} />}
      <GuiaEstadosPedido es={es} />
      <FiltrosPedidos
        estado={control.estado}
        buscar={control.buscar}
        es={es}
        alCambiar={control.establecerEstado}
        alBuscar={control.establecerBuscar}
        alAplicarBusqueda={control.aplicarBusqueda}
        alLimpiarBusqueda={control.limpiarBusqueda}
      />
      {control.cargando && !control.respuesta && (
        <div
          className="panel p-8 text-center text-sm text-slate-500"
          role="status"
        >
          {es ? "Cargando pedidos…" : "Loading orders…"}
        </div>
      )}
      {!control.cargando && control.error && !control.respuesta && (
        <div className="panel p-5 text-center">
          <button className="boton-secundario" onClick={control.reintentar}>
            {es ? "Reintentar" : "Try again"}
          </button>
        </div>
      )}
      {control.respuesta && (
        <section
          className="space-y-4"
          aria-busy={control.cargando || undefined}
        >
          <p className="text-sm text-slate-500" aria-live="polite">
            {es
              ? `${control.respuesta.paginacion.total} pedido${control.respuesta.paginacion.total === 1 ? "" : "s"}`
              : `${control.respuesta.paginacion.total} order${control.respuesta.paginacion.total === 1 ? "" : "s"}`}
          </p>
          <div
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            data-capacitacion="pedidos.listado"
          >
            {control.pedidos.map((pedido) => (
              <TarjetaPedidoWeb
                key={pedido.id}
                pedido={pedido}
                es={es}
                puedeAlmacen={puedeAlmacen}
                puedeAsignarProveedor={puedeAsignarProveedor}
                puedeEntregar={puedeEntregar}
                destacado={pedido.id === pedidoDestacado}
                alGestionar={() => control.abrirGestion(pedido)}
                alAvanzar={() => control.abrirAvance(pedido)}
                alEntregar={() => control.abrirEntrega(pedido)}
              />
            ))}
          </div>
          {!control.cargando && control.pedidos.length === 0 && (
            <div className="panel">
              <EstadoVacio
                texto={
                  es
                    ? "No se encontraron pedidos con estos filtros."
                    : "No orders match these filters."
                }
              />
            </div>
          )}
          <div className="panel overflow-hidden">
            <Paginador
              pagina={control.respuesta.paginacion.pagina}
              totalPaginas={control.respuesta.paginacion.totalPaginas}
              cambiar={control.cambiarPagina}
            />
          </div>
        </section>
      )}
      <Modal
        abierto={control.modal}
        cerrar={control.cerrarModal}
        titulo={es ? "Nuevo pedido" : "New order"}
        ancho="amplio"
      >
        {control.error && <MensajeError mensaje={control.error} />}
        <FormularioNuevoPedido
          es={es}
          cancelar={t.cancelar}
          guardar={t.guardar}
          guardando={control.guardando}
          guardandoProducto={control.guardandoProducto}
          puedeCrearProducto={puedeCrearProducto}
          catalogosProducto={control.catalogosProducto}
          alCancelar={control.cerrarModal}
          alEnviar={control.crear}
          alCrearProducto={control.crearProducto}
          alCrearCategoriaProducto={control.crearCategoriaProducto}
        />
      </Modal>
      <Modal
        abierto={Boolean(control.gestion)}
        cerrar={control.cerrarGestion}
        titulo={`${es ? "Pedir a proveedor" : "Order from supplier"} · ${control.gestion?.folio ?? ""}`}
      >
        {control.error && <MensajeError mensaje={control.error} />}
        {control.gestion && (
          <FormularioGestionPedido
            key={control.gestion.id}
            pedido={control.gestion}
            proveedores={control.proveedores}
            es={es}
            guardando={control.guardando}
            puedeCrearProveedor={puedeCrearProveedor}
            alCancelar={control.cerrarGestion}
            alConfirmar={control.pedirAProveedor}
            alCrearProveedor={control.crearProveedor}
          />
        )}
      </Modal>
      <Modal
        abierto={Boolean(control.avance)}
        cerrar={control.cerrarAvance}
        titulo={`${es ? "Revisar avance" : "Review progress"} · ${control.avance?.folio ?? ""}`}
      >
        {control.error && <MensajeError mensaje={control.error} />}
        {control.avance && (
          <ConfirmarAvancePedido
            key={`${control.avance.id}-${control.avance.estado}`}
            pedido={control.avance}
            es={es}
            guardando={control.guardando}
            alCancelar={control.cerrarAvance}
            alConfirmar={() => control.avanzar(control.avance!)}
          />
        )}
      </Modal>
      <Modal
        abierto={Boolean(control.entrega)}
        cerrar={control.cerrarEntrega}
        titulo={`${es ? "Entregar pedido" : "Deliver order"} · ${control.entrega?.folio ?? ""}`}
      >
        {control.error && <MensajeError mensaje={control.error} />}
        {control.entrega && (
          <FormularioEntregaPedido
            key={control.entrega.id}
            pedido={control.entrega}
            totalPedido={control.entrega.items.reduce(
              (suma, item) =>
                suma + Number(item.precioEstimado) * item.cantidad,
              0,
            )}
            es={es}
            guardando={control.guardando}
            cancelar={t.cancelar}
            alCancelar={control.cerrarEntrega}
            alGuardar={control.entregar}
          />
        )}
      </Modal>
    </>
  );
}
