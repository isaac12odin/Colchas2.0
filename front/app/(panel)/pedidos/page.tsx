"use client";

import { Plus } from "lucide-react";

import { usarAplicacion } from "@/componentes/proveedores";
import {
  EncabezadoPagina,
  EstadoVacio,
  MensajeError,
  Modal,
} from "@/componentes/ui";
import { FiltrosPedidos } from "@/modulos/pedidos/FiltrosPedidos";
import { FormularioEntregaPedido } from "@/modulos/pedidos/FormularioEntregaPedido";
import { FormularioNuevoPedido } from "@/modulos/pedidos/FormularioNuevoPedido";
import { TarjetaPedidoWeb } from "@/modulos/pedidos/TarjetaPedidoWeb";
import { usarPedidosWeb } from "@/modulos/pedidos/usarPedidosWeb";

export default function PaginaPedidos() {
  const { t, idioma, usuario } = usarAplicacion();
  const es = idioma === "es";
  const puedeCrear = usuario?.rol !== "ALMACENISTA";
  const control = usarPedidosWeb();
  const puedeAlmacen =
    usuario?.rol === "ADMINISTRADOR" || usuario?.rol === "ALMACENISTA";
  const puedeEntregar =
    usuario?.rol === "ADMINISTRADOR" || usuario?.rol === "COBRADOR";

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
            <button className="boton-primario" onClick={control.abrirModal}>
              <Plus size={18} />
              {es ? "Pedido" : "Order"}
            </button>
          ) : undefined
        }
      />
      {control.error && <MensajeError mensaje={control.error} />}
      <FiltrosPedidos
        estado={control.estado}
        es={es}
        alCambiar={control.establecerEstado}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {control.pedidos.map((pedido) => (
          <TarjetaPedidoWeb
            key={pedido.id}
            pedido={pedido}
            es={es}
            puedeAlmacen={puedeAlmacen}
            puedeEntregar={puedeEntregar}
            alAvanzar={() => void control.avanzar(pedido)}
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
      >
        <FormularioNuevoPedido
          es={es}
          cancelar={t.cancelar}
          guardar={t.guardar}
          alCancelar={control.cerrarModal}
          alEnviar={control.crear}
        />
      </Modal>
      <Modal
        abierto={Boolean(control.entrega)}
        cerrar={control.cerrarEntrega}
        titulo={`${es ? "Entregar pedido" : "Deliver order"} · ${control.entrega?.folio ?? ""}`}
      >
        <FormularioEntregaPedido
          key={control.entrega?.id}
          tipoVenta={control.tipoVenta}
          numeroTarjetaActual={control.entrega?.cliente.numeroTarjeta}
          totalPedido={
            control.entrega?.items.reduce(
              (suma, item) =>
                suma + Number(item.precioEstimado) * item.cantidad,
              0,
            ) ?? 0
          }
          es={es}
          cancelar={t.cancelar}
          alCambiarTipo={control.establecerTipoVenta}
          alCancelar={control.cerrarEntrega}
          alEnviar={control.entregar}
          items={control.entrega?.items ?? []}
          proveedores={control.proveedores}
        />
      </Modal>
    </>
  );
}
