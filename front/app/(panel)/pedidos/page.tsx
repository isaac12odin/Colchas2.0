"use client";

import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { usarAplicacion } from "@/componentes/proveedores";
import {
  EncabezadoPagina,
  EstadoVacio,
  MensajeError,
  Modal,
} from "@/componentes/ui";
import { FiltrosPedidos } from "@/modulos/pedidos/FiltrosPedidos";
import { ConfirmarAvancePedido } from "@/modulos/pedidos/ConfirmarAvancePedido";
import { FormularioEntregaPedido } from "@/modulos/pedidos/FormularioEntregaPedido";
import { FormularioGestionPedido } from "@/modulos/pedidos/FormularioGestionPedido";
import { FormularioNuevoPedido } from "@/modulos/pedidos/FormularioNuevoPedido";
import { GuiaEstadosPedido } from "@/modulos/pedidos/GuiaEstadosPedido";
import { TarjetaPedidoWeb } from "@/modulos/pedidos/TarjetaPedidoWeb";
import { usarPedidosWeb } from "@/modulos/pedidos/usarPedidosWeb";
import { usarAccionInicial } from "@/lib/usarAccionInicial";

export default function PaginaPedidos() {
  const { t, idioma, usuario } = usarAplicacion();
  const es = idioma === "es";
  const puedeCrear = [
    "ADMINISTRADOR",
    "CONTABLE",
    "VENDEDOR",
    "COBRADOR",
  ].includes(usuario?.rol ?? "");
  const control = usarPedidosWeb();
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
  const [pedidoDestacado, establecerPedidoDestacado] = useState("");
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
      ["RECIBIDO_ALMACEN", "LISTO_ENTREGA"].includes(pedido.estado) &&
      puedeEntregar
    ) {
      control.abrirEntrega(pedido);
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("pedido");
    window.history.replaceState(window.history.state, "", url.pathname);
  }, [pedidoDestacado, control, puedeAsignarProveedor, puedeEntregar]);

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
        es={es}
        alCambiar={control.establecerEstado}
      />
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
      {control.pedidos.length === 0 && (
        <div className="panel">
          <EstadoVacio
            texto={
              es
                ? "No hay pedidos en este estado."
                : "No orders in this status."
            }
          />
        </div>
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
