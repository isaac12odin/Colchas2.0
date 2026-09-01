import { useCallback, useEffect, useRef, useState } from "react";

import { api, ErrorApi } from "@/lib/api";
import { usarDatosVivos } from "@/lib/usarDatosVivos";
import type { Pagina } from "@/lib/tipos";
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

const LIMITE_PEDIDOS = 12;

function normalizarPagina(
  respuesta: Pagina<PedidoWeb> | { datos: PedidoWeb[] },
  pagina: number,
): Pagina<PedidoWeb> {
  if ("paginacion" in respuesta) return respuesta;
  return {
    datos: respuesta.datos,
    paginacion: {
      pagina,
      limite: LIMITE_PEDIDOS,
      total: respuesta.datos.length,
      totalPaginas: 1,
    },
  };
}

export function usarPedidosWeb(pedidoId = "") {
  const [respuesta, establecerRespuesta] = useState<Pagina<PedidoWeb> | null>(
    null,
  );
  const [estado, establecerEstado] = useState("");
  const [buscar, establecerBuscar] = useState("");
  const [consulta, establecerConsulta] = useState("");
  const [pagina, establecerPagina] = useState(1);
  const [cargando, establecerCargando] = useState(true);
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
  const solicitudActual = useRef(0);

  const cargar = useCallback(async () => {
    const solicitud = ++solicitudActual.current;
    const parametros = new URLSearchParams({
      pagina: String(pedidoId ? 1 : pagina),
      limite: String(pedidoId ? 1 : LIMITE_PEDIDOS),
    });
    if (estado) parametros.set("estado", estado);
    if (consulta) parametros.set("buscar", consulta);
    if (pedidoId) parametros.set("pedidoId", pedidoId);
    establecerCargando(true);
    establecerError("");
    try {
      const datos = await api<Pagina<PedidoWeb> | { datos: PedidoWeb[] }>(
        `/pedidos?${parametros.toString()}`,
      );
      if (solicitud === solicitudActual.current) {
        const paginaRecibida = normalizarPagina(datos, pedidoId ? 1 : pagina);
        if (!pedidoId && pagina > paginaRecibida.paginacion.totalPaginas) {
          establecerPagina(paginaRecibida.paginacion.totalPaginas);
          establecerRespuesta(null);
        } else {
          establecerRespuesta(paginaRecibida);
        }
      }
    } catch (e) {
      if (solicitud === solicitudActual.current)
        establecerError(
          e instanceof ErrorApi
            ? e.message
            : "No fue posible cargar los pedidos.",
        );
    } finally {
      if (solicitud === solicitudActual.current) establecerCargando(false);
    }
  }, [consulta, estado, pagina, pedidoId]);

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
          items: datos.items,
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
    pedidos: respuesta?.datos ?? [],
    respuesta,
    estado,
    buscar,
    pagina,
    cargando,
    modal,
    gestion,
    entrega,
    avance,
    proveedores,
    catalogosProducto,
    error,
    guardando,
    guardandoProducto,
    establecerBuscar,
    establecerEstado: (nuevoEstado: string) => {
      establecerEstado(nuevoEstado);
      establecerPagina(1);
      establecerRespuesta(null);
    },
    aplicarBusqueda: () => {
      establecerConsulta(buscar.trim());
      establecerPagina(1);
      establecerRespuesta(null);
    },
    limpiarBusqueda: () => {
      establecerBuscar("");
      establecerConsulta("");
      establecerPagina(1);
      establecerRespuesta(null);
    },
    cambiarPagina: (nuevaPagina: number) => {
      establecerPagina(nuevaPagina);
      establecerRespuesta(null);
    },
    reintentar: cargar,
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
