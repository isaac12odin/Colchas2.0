import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";

import { api, ErrorApi } from "../../api";
import { guardarCache, leerCache } from "../../almacenLocal";
import { usarDatosVivosMovil } from "../../usarDatosVivosMovil";
import type {
  CategoriaProductoMovil,
  CatalogosProductoMovil,
  DatosProductoMovil,
  ProductoInventarioMovil,
} from "./tipos";

export function usarInventarioMovil(es: boolean) {
  const [productos, establecerProductos] = useState<ProductoInventarioMovil[]>(
    [],
  );
  const [buscar, establecerBuscar] = useState("");
  const [categoriaId, establecerCategoriaId] = useState("");
  const [categorias, establecerCategorias] = useState<CategoriaProductoMovil[]>(
    [],
  );
  const [cargando, establecerCargando] = useState(true);
  const [cargandoMas, establecerCargandoMas] = useState(false);
  const [paginaActual, establecerPaginaActual] = useState(1);
  const [totalPaginas, establecerTotalPaginas] = useState(1);
  const [totalProductos, establecerTotalProductos] = useState(0);
  const [guardando, establecerGuardando] = useState(false);
  const [offline, establecerOffline] = useState(false);
  const [modalAbierto, establecerModalAbierto] = useState(false);
  const [productoEditar, establecerProductoEditar] =
    useState<ProductoInventarioMovil | null>(null);
  const [codigoInicial, establecerCodigoInicial] = useState<{
    valor: string;
    tipo: "BARRAS" | "QR";
  } | null>(null);
  const productosRef = useRef<ProductoInventarioMovil[]>([]);

  const cargar = useCallback(
    async (pagina = 1, acumular = false) => {
      if (pagina === 1) establecerCargando(true);
      else establecerCargandoMas(true);
      try {
        const parametros = new URLSearchParams({
          pagina: String(pagina),
          limite: "60",
        });
        if (buscar.trim()) parametros.set("buscar", buscar.trim());
        if (categoriaId) parametros.set("categoriaId", categoriaId);
        const peticionProductos = api<{
          datos: ProductoInventarioMovil[];
          paginacion: { pagina: number; total: number; totalPaginas: number };
        }>(`/inventario/productos?${parametros.toString()}`);
        const [respuesta, catalogos] = await Promise.all([
          peticionProductos,
          pagina === 1
            ? api<CatalogosProductoMovil>("/inventario/catalogos-producto")
            : Promise.resolve(null),
        ]);
        const idsNuevos = new Set(
          respuesta.datos.map((producto) => producto.id),
        );
        const actualizados = acumular
          ? [
              ...productosRef.current.filter(
                (producto) => !idsNuevos.has(producto.id),
              ),
              ...respuesta.datos,
            ]
          : respuesta.datos;
        productosRef.current = actualizados;
        establecerProductos(actualizados);
        establecerPaginaActual(respuesta.paginacion.pagina);
        establecerTotalPaginas(respuesta.paginacion.totalPaginas);
        establecerTotalProductos(respuesta.paginacion.total);
        if (catalogos) {
          establecerCategorias(catalogos.categorias);
          await guardarCache("categorias_producto", catalogos.categorias);
        }
        if (!buscar.trim() && !categoriaId)
          await guardarCache("inventario", actualizados);
        establecerOffline(false);
      } catch {
        if (pagina === 1) {
          const guardados =
            (await leerCache<ProductoInventarioMovil[]>("inventario")) ?? [];
          productosRef.current = guardados;
          establecerProductos(guardados);
          establecerTotalProductos(guardados.length);
          establecerCategorias(
            (await leerCache<CategoriaProductoMovil[]>(
              "categorias_producto",
            )) ?? [],
          );
        }
        establecerOffline(true);
      } finally {
        if (pagina === 1) establecerCargando(false);
        else establecerCargandoMas(false);
      }
    },
    [buscar, categoriaId],
  );

  usarDatosVivosMovil(cargar);
  useEffect(() => {
    const espera = setTimeout(() => void cargar(1, false), 350);
    return () => clearTimeout(espera);
  }, [buscar, categoriaId, cargar]);

  const visibles = useMemo(() => {
    const termino = buscar.trim().toLowerCase();
    return productos.filter((producto) => {
      const coincideCategoria =
        !categoriaId || producto.categoriaId === categoriaId;
      const coincideTexto =
        !termino ||
        `${producto.sku} ${producto.nombre} ${producto.marca} ${producto.categoria ?? ""} ${producto.codigoBarras ?? ""} ${producto.codigoQr ?? ""}`
          .toLowerCase()
          .includes(termino);
      return coincideCategoria && coincideTexto;
    });
  }, [buscar, categoriaId, productos]);

  async function crearCategoria(nombre: string) {
    if (offline) return null;
    try {
      const categoria = await api<CategoriaProductoMovil>(
        "/inventario/categorias-producto",
        { method: "POST", body: JSON.stringify({ nombre }) },
      );
      establecerCategorias((actuales) => [
        ...actuales.filter((actual) => actual.id !== categoria.id),
        categoria,
      ]);
      return categoria;
    } catch (error) {
      Alert.alert(
        es ? "No se pudo crear la agrupación" : "Could not create group",
        error instanceof Error ? error.message : undefined,
      );
      return null;
    }
  }

  function abrirNuevo() {
    establecerProductoEditar(null);
    establecerCodigoInicial(null);
    establecerModalAbierto(true);
  }

  function abrirNuevoConCodigo(valor: string, tipo: "BARRAS" | "QR") {
    establecerProductoEditar(null);
    establecerCodigoInicial({ valor, tipo });
    establecerModalAbierto(true);
  }

  function abrirEdicion(producto: ProductoInventarioMovil) {
    establecerCodigoInicial(null);
    establecerProductoEditar(producto);
    establecerModalAbierto(true);
  }

  function cerrarModal() {
    if (guardando) return;
    establecerModalAbierto(false);
    establecerProductoEditar(null);
    establecerCodigoInicial(null);
  }

  async function resolverCodigo(valor: string, tipo: "BARRAS" | "QR") {
    const local = productosRef.current.find(
      (producto) =>
        producto.codigoBarras === valor ||
        producto.codigoQr === valor ||
        producto.sku === valor,
    );
    if (local) {
      abrirEdicion(local);
      return;
    }
    if (offline) {
      Alert.alert(
        es ? "Código no disponible sin conexión" : "Code unavailable offline",
        es
          ? "Conéctate para confirmar si el código pertenece a uno de los 5 mil productos."
          : "Connect to confirm whether this code belongs to the full catalog.",
      );
      return;
    }
    try {
      abrirEdicion(
        await api<ProductoInventarioMovil>(
          `/inventario/productos/codigo/${encodeURIComponent(valor)}`,
        ),
      );
    } catch (error) {
      if (error instanceof ErrorApi && error.estado === 404) {
        abrirNuevoConCodigo(valor, tipo);
        return;
      }
      Alert.alert(
        es ? "No se pudo comprobar el código" : "Could not verify code",
        error instanceof Error ? error.message : undefined,
      );
    }
  }

  async function guardar(datos: DatosProductoMovil) {
    if (offline) {
      Alert.alert(
        es ? "Se requiere conexión" : "Connection required",
        es
          ? "Las altas de inventario se confirman directamente en el servidor para evitar existencias duplicadas."
          : "Inventory additions are confirmed directly on the server to prevent duplicate stock.",
      );
      return false;
    }
    establecerGuardando(true);
    try {
      const guardado = await api<ProductoInventarioMovil>(
        productoEditar
          ? `/inventario/productos/${productoEditar.id}`
          : "/inventario/productos",
        {
          method: productoEditar ? "PATCH" : "POST",
          body: JSON.stringify(datos),
        },
      );
      await cargar(1, false);
      Alert.alert(
        es ? "Producto guardado" : "Product saved",
        es
          ? `${guardado.nombre} ya está disponible en inventario.`
          : `${guardado.nombre} is now available in inventory.`,
      );
      return true;
    } catch (error) {
      Alert.alert(
        es ? "No se pudo guardar" : "Could not save",
        error instanceof Error ? error.message : undefined,
      );
      return false;
    } finally {
      establecerGuardando(false);
    }
  }

  return {
    productos,
    totalProductos,
    visibles,
    buscar,
    establecerBuscar,
    categoriaId,
    establecerCategoriaId,
    categorias,
    cargando,
    cargandoMas,
    guardando,
    offline,
    modalAbierto,
    productoEditar,
    codigoInicial,
    cargar,
    abrirNuevo,
    abrirEdicion,
    resolverCodigo,
    cargarMas: () => {
      if (!cargando && !cargandoMas && !offline && paginaActual < totalPaginas)
        void cargar(paginaActual + 1, true);
    },
    cerrarModal,
    guardar,
    crearCategoria,
  };
}

export type ControlInventarioMovil = ReturnType<typeof usarInventarioMovil>;
