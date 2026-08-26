import { useCallback, useEffect, useState } from "react";

import { api, ErrorApi } from "@/lib/api";
import { usarDatosVivos } from "@/lib/usarDatosVivos";
import type {
  CategoriaProducto,
  CatalogosProducto,
  DatosProductoWeb,
} from "@/modulos/inventario/tipos";
import type { NuevoPedidoWeb } from "./FormularioNuevoPedido";
import {
  siguienteEstado,
  type DatosEntregaPedidoWeb,
  type PedidoWeb,
  type ProductoPedido,
} from "./tipos";

export function usarPedidosWeb() {
  const [pedidos, establecerPedidos] = useState<PedidoWeb[]>([]);
  const [estado, establecerEstado] = useState("");
  const [modal, establecerModal] = useState(false);
  const [gestion, establecerGestion] = useState<PedidoWeb | null>(null);
  const [entrega, establecerEntrega] = useState<PedidoWeb | null>(null);
  const [avance, establecerAvance] = useState<PedidoWeb | null>(null);
  const [error, establecerError] = useState("");
  const [guardando, establecerGuardando] = useState(false);
  const [guardandoProducto, establecerGuardandoProducto] = useState(false);
  const [proveedores, establecerProveedores] = useState<
    Array<{ id: string; nombre: string }>
  >([]);
  const [catalogosProducto, establecerCatalogosProducto] =
    useState<CatalogosProducto>({ marcas: [], categorias: [] });

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
  usarDatosVivos(cargar);
  const cargarProveedores = useCallback(
    () =>
      api<{ datos: Array<{ id: string; nombre: string }> }>(
        "/proveedores/opciones",
      )
        .then((respuesta) => establecerProveedores(respuesta.datos))
        .catch(() => establecerProveedores([])),
    [],
  );
  useEffect(() => void cargarProveedores(), [cargarProveedores]);
  const cargarCatalogosProducto = useCallback(
    () =>
      api<CatalogosProducto>("/inventario/catalogos-producto")
        .then(establecerCatalogosProducto)
        .catch(() =>
          establecerCatalogosProducto({ marcas: [], categorias: [] }),
        ),
    [],
  );
  useEffect(() => void cargarCatalogosProducto(), [cargarCatalogosProducto]);

  async function crear(datos: NuevoPedidoWeb) {
    establecerGuardando(true);
    establecerError("");
    try {
      await api("/pedidos", {
        method: "POST",
        body: JSON.stringify({
          clienteId: datos.clienteId,
          fechaCompromiso: datos.fechaCompromiso
            ? new Date(`${datos.fechaCompromiso}T12:00:00`).toISOString()
            : undefined,
          items: [
            {
              productoId: datos.productoId,
              cantidad: datos.cantidad,
            },
          ],
        }),
      });
      establecerModal(false);
      await cargar();
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
    } finally {
      establecerGuardando(false);
    }
  }

  async function crearProducto(
    datos: DatosProductoWeb,
  ): Promise<ProductoPedido | null> {
    establecerGuardandoProducto(true);
    establecerError("");
    try {
      return await api<ProductoPedido>("/inventario/productos", {
        method: "POST",
        body: JSON.stringify(datos),
      });
    } catch (e) {
      establecerError(
        e instanceof ErrorApi ? e.message : "No fue posible crear el producto.",
      );
      return null;
    } finally {
      establecerGuardandoProducto(false);
    }
  }

  async function crearCategoriaProducto(nombre: string) {
    try {
      const categoria = await api<CategoriaProducto>(
        "/inventario/categorias-producto",
        { method: "POST", body: JSON.stringify({ nombre }) },
      );
      establecerCatalogosProducto((actuales) => ({
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
          : "No fue posible crear la agrupación.",
      );
      return null;
    }
  }

  async function pedirAProveedor(
    asignaciones: Array<{ itemPedidoId: string; proveedorId: string }>,
  ) {
    if (!gestion) return;
    establecerGuardando(true);
    establecerError("");
    try {
      await api(`/pedidos/${gestion.id}/estado`, {
        method: "PATCH",
        body: JSON.stringify({
          estado: "PEDIDO_PROVEEDOR",
          proveedores: asignaciones,
        }),
      });
      establecerGestion(null);
      await cargar();
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
    } finally {
      establecerGuardando(false);
    }
  }

  async function crearProveedor(datos: {
    nombre: string;
    contacto?: string;
    telefono?: string;
  }) {
    establecerGuardando(true);
    establecerError("");
    try {
      const proveedor = await api<{ id: string; nombre: string }>(
        "/proveedores",
        { method: "POST", body: JSON.stringify(datos) },
      );
      establecerProveedores((actuales) =>
        [...actuales, proveedor].sort((a, b) =>
          a.nombre.localeCompare(b.nombre, "es"),
        ),
      );
      return proveedor;
    } catch (e) {
      establecerError(
        e instanceof ErrorApi
          ? e.message
          : "No fue posible crear el proveedor.",
      );
      return null;
    } finally {
      establecerGuardando(false);
    }
  }

  async function avanzar(pedido: PedidoWeb) {
    const nuevo = siguienteEstado[pedido.estado];
    if (!nuevo) return;
    establecerGuardando(true);
    establecerError("");
    try {
      await api(`/pedidos/${pedido.id}/estado`, {
        method: "PATCH",
        body: JSON.stringify({ estado: nuevo }),
      });
      establecerAvance(null);
      await cargar();
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
    } finally {
      establecerGuardando(false);
    }
  }

  async function entregar(datos: DatosEntregaPedidoWeb) {
    if (!entrega) return;
    establecerGuardando(true);
    establecerError("");
    try {
      await api(`/pedidos/${entrega.id}/entregar`, {
        method: "POST",
        body: JSON.stringify(datos),
      });
      establecerEntrega(null);
      await cargar();
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
    } finally {
      establecerGuardando(false);
    }
  }

  return {
    pedidos,
    estado,
    modal,
    gestion,
    entrega,
    avance,
    proveedores,
    catalogosProducto,
    error,
    guardando,
    guardandoProducto,
    establecerEstado,
    abrirModal: () => {
      establecerError("");
      establecerModal(true);
    },
    cerrarModal: () => establecerModal(false),
    abrirGestion: establecerGestion,
    cerrarGestion: () => establecerGestion(null),
    abrirEntrega: (pedido: PedidoWeb) => {
      establecerError("");
      establecerEntrega(pedido);
    },
    cerrarEntrega: () => establecerEntrega(null),
    abrirAvance: (pedido: PedidoWeb) => {
      establecerError("");
      establecerAvance(pedido);
    },
    cerrarAvance: () => establecerAvance(null),
    crear,
    crearProducto,
    crearCategoriaProducto,
    crearProveedor,
    pedirAProveedor,
    avanzar,
    entregar,
  };
}

export type ControlPedidosWeb = ReturnType<typeof usarPedidosWeb>;
