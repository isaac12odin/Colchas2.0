import type { ImagenListaParaApi } from "@/lib/imagenes";

export interface ProductoInventario {
  id: string;
  sku: string;
  nombre: string;
  marca: string;
  codigoBarras: string | null;
  codigoQr: string | null;
  categoria: string | null;
  categoriaId: string | null;
  existencia: number;
  existenciaMinima: number;
  precioVenta: string;
  precioCompra: string;
  tieneFoto: boolean;
  fotoActualizadaEn: string | null;
  activo: boolean;
}

export interface DatosProductoWeb {
  sku: string;
  nombre: string;
  marca: string;
  categoriaId: string;
  codigoBarras?: string | null;
  codigoQr?: string | null;
  existenciaInicial?: number;
  existenciaMinima: number;
  precioVenta: number;
  precioCompra: number;
  foto?: ImagenListaParaApi;
  eliminarFoto?: boolean;
}

export interface CatalogosProducto {
  marcas: string[];
  categorias: CategoriaProducto[];
}

export interface CategoriaProducto {
  id: string;
  nombre: string;
}

export function urlFotoProducto(producto: ProductoInventario) {
  if (!producto.tieneFoto) return null;
  const version = producto.fotoActualizadaEn
    ? `?v=${encodeURIComponent(producto.fotoActualizadaEn)}`
    : "";
  return `/api/inventario/productos/${producto.id}/foto${version}`;
}
