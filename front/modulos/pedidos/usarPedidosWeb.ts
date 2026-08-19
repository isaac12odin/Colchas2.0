import { type FormEvent, useCallback, useEffect, useState } from "react";

import { api, ErrorApi } from "@/lib/api";
import { siguienteEstado, type PedidoWeb } from "./tipos";

export function usarPedidosWeb() {
  const [pedidos, establecerPedidos] = useState<PedidoWeb[]>([]);
  const [estado, establecerEstado] = useState("");
  const [modal, establecerModal] = useState(false);
  const [entrega, establecerEntrega] = useState<PedidoWeb | null>(null);
  const [tipoVenta, establecerTipoVenta] = useState("CREDITO");
  const [error, establecerError] = useState("");
  const [proveedores, establecerProveedores] = useState<
    Array<{ id: string; nombre: string }>
  >([]);

  const cargar = useCallback(
    () =>
      api<{ datos: PedidoWeb[] }>(
        `/pedidos${estado ? `?estado=${estado}` : ""}`,
      )
        .then((respuesta) => establecerPedidos(respuesta.datos))
        .catch((e) => establecerError(e.message)),
    [estado],
  );

  useEffect(() => void cargar(), [cargar]);
  useEffect(() => {
    api<{ datos: Array<{ id: string; nombre: string }> }>("/proveedores")
      .then((respuesta) => establecerProveedores(respuesta.datos))
      .catch(() => establecerProveedores([]));
  }, []);

  async function crear(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = new FormData(evento.currentTarget);
    try {
      await api("/pedidos", {
        method: "POST",
        body: JSON.stringify({
          clienteId: formulario.get("clienteId"),
          fechaCompromiso: formulario.get("fechaCompromiso")
            ? new Date(String(formulario.get("fechaCompromiso"))).toISOString()
            : undefined,
          items: [
            {
              productoId: formulario.get("productoId"),
              cantidad: Number(formulario.get("cantidad")),
            },
          ],
        }),
      });
      establecerModal(false);
      cargar();
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
    }
  }

  async function avanzar(pedido: PedidoWeb) {
    const nuevo = siguienteEstado[pedido.estado];
    if (!nuevo) return;
    try {
      await api(`/pedidos/${pedido.id}/estado`, {
        method: "PATCH",
        body: JSON.stringify({ estado: nuevo }),
      });
      cargar();
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
    }
  }

  async function entregar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!entrega) return;
    const formulario = new FormData(evento.currentTarget);
    const cuerpo: Record<string, unknown> = {
      tipo: tipoVenta,
      numeroTarjeta: formulario.get("numeroTarjeta") || undefined,
      anticipo: Number(formulario.get("anticipo") || 0),
      metodoAnticipo: "EFECTIVO",
      proveedores: entrega.items.map((item) => ({
        itemPedidoId: item.id,
        proveedorId:
          formulario.get(`proveedor_${item.id}`) || item.proveedor?.id,
      })),
    };
    if (tipoVenta === "CREDITO" && formulario.get("montoCuota")) {
      cuerpo.plan = {
        periodicidad: formulario.get("periodicidad"),
        montoCuota: Number(formulario.get("montoCuota")),
        primerVencimiento: new Date(
          String(formulario.get("primerVencimiento")),
        ).toISOString(),
      };
    }
    try {
      await api(`/pedidos/${entrega.id}/entregar`, {
        method: "POST",
        body: JSON.stringify(cuerpo),
      });
      establecerEntrega(null);
      cargar();
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
    }
  }

  return {
    pedidos,
    estado,
    modal,
    entrega,
    tipoVenta,
    proveedores,
    error,
    establecerEstado,
    abrirModal: () => establecerModal(true),
    cerrarModal: () => establecerModal(false),
    abrirEntrega: establecerEntrega,
    cerrarEntrega: () => establecerEntrega(null),
    establecerTipoVenta,
    crear,
    avanzar,
    entregar,
  };
}

export type ControlPedidosWeb = ReturnType<typeof usarPedidosWeb>;
