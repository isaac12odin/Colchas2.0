export interface FotoProductoMovil {
  uri: string;
  nombre: string;
  mime: "image/jpeg";
  base64: string;
}

export interface ProductoInventarioMovil {
  id: string;
  sku: string;
  nombre: string;
  marca: string;
  categoria?: string | null;
  categoriaId?: string | null;
  codigoBarras?: string | null;
  codigoQr?: string | null;
  existencia: number;
  existenciaMinima: number;
  precioVenta: string;
  precioCompra: string;
  tieneFoto: boolean;
  fotoActualizadaEn?: string | null;
}

export interface BorradorProductoMovil {
  nombre: string;
  marca: string;
  sku: string;
  categoriaId: string;
  codigoBarras: string;
  codigoQr: string;
  precioCompra: string;
  precioVenta: string;
  existenciaInicial: string;
  existenciaMinima: string;
}

export interface DatosProductoMovil {
  nombre: string;
  marca: string;
  sku: string;
  categoriaId: string;
  codigoBarras: string | null;
  codigoQr: string | null;
  precioCompra: number;
  precioVenta: number;
  existenciaMinima: number;
  existenciaInicial?: number;
  foto?: Omit<FotoProductoMovil, "uri">;
  eliminarFoto?: boolean;
}

export const borradorProductoVacio: BorradorProductoMovil = {
  nombre: "",
  marca: "",
  sku: "",
  categoriaId: "",
  codigoBarras: "",
  codigoQr: "",
  precioCompra: "",
  precioVenta: "",
  existenciaInicial: "0",
  existenciaMinima: "0",
};

export function borradorDesdeProducto(
  producto?: ProductoInventarioMovil | null,
): BorradorProductoMovil {
  if (!producto) return { ...borradorProductoVacio };
  return {
    nombre: producto.nombre,
    marca: producto.marca,
    sku: producto.sku,
    categoriaId: producto.categoriaId ?? "",
    codigoBarras: producto.codigoBarras ?? "",
    codigoQr: producto.codigoQr ?? "",
    precioCompra: String(producto.precioCompra),
    precioVenta: String(producto.precioVenta),
    existenciaInicial: String(producto.existencia),
    existenciaMinima: String(producto.existenciaMinima),
  };
}

export interface CategoriaProductoMovil {
  id: string;
  nombre: string;
}

export interface CatalogosProductoMovil {
  marcas: string[];
  categorias: CategoriaProductoMovil[];
}
