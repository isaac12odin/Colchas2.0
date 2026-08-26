import type {
  BorradorProductoMovil,
  DatosProductoMovil,
  FotoProductoMovil,
} from "./tipos";

function numero(valor: string) {
  return Number(valor.trim().replace(",", "."));
}

export type ResultadoProducto =
  | { exito: true; datos: DatosProductoMovil }
  | { exito: false; mensaje: string };

/** Normaliza y valida el formulario antes de consumir datos o red móvil. */
export function prepararDatosProducto(
  borrador: BorradorProductoMovil,
  opciones: {
    editando: boolean;
    foto?: FotoProductoMovil | null;
    eliminarFoto?: boolean;
    es?: boolean;
  },
): ResultadoProducto {
  const es = opciones.es !== false;
  const nombre = borrador.nombre.trim();
  const marca = borrador.marca.trim();
  const sku = borrador.sku.trim();
  const precioCompra = numero(borrador.precioCompra);
  const precioVenta = numero(borrador.precioVenta);
  const existenciaMinima = numero(borrador.existenciaMinima);
  const existenciaInicial = numero(borrador.existenciaInicial);

  if (nombre.length < 2 || marca.length < 1 || sku.length < 2)
    return {
      exito: false,
      mensaje: es
        ? "Completa nombre, marca y un SKU de al menos 2 caracteres."
        : "Enter a name, brand, and a SKU of at least 2 characters.",
    };
  if (!borrador.categoriaId)
    return {
      exito: false,
      mensaje: es
        ? "Selecciona una agrupación del catálogo, por ejemplo Colcha o Sábana."
        : "Select a catalog group, such as Quilt or Sheet.",
    };
  if (!Number.isFinite(precioCompra) || precioCompra < 0)
    return {
      exito: false,
      mensaje: es ? "El costo no es válido." : "The cost is invalid.",
    };
  if (!Number.isFinite(precioVenta) || precioVenta <= 0)
    return {
      exito: false,
      mensaje: es
        ? "El precio de venta debe ser mayor a cero."
        : "The sale price must be greater than zero.",
    };
  if (!Number.isInteger(existenciaMinima) || existenciaMinima < 0)
    return {
      exito: false,
      mensaje: es
        ? "La existencia mínima debe ser un entero positivo o cero."
        : "Minimum stock must be a positive integer or zero.",
    };
  if (
    !opciones.editando &&
    (!Number.isInteger(existenciaInicial) || existenciaInicial < 0)
  )
    return {
      exito: false,
      mensaje: es
        ? "La existencia inicial debe ser un entero positivo o cero."
        : "Initial stock must be a positive integer or zero.",
    };

  const foto = opciones.foto
    ? {
        nombre: opciones.foto.nombre,
        mime: opciones.foto.mime,
        base64: opciones.foto.base64,
      }
    : undefined;
  return {
    exito: true,
    datos: {
      nombre,
      marca,
      sku,
      categoriaId: borrador.categoriaId,
      codigoBarras: borrador.codigoBarras.trim() || null,
      codigoQr: borrador.codigoQr.trim() || null,
      precioCompra,
      precioVenta,
      existenciaMinima,
      ...(!opciones.editando ? { existenciaInicial } : {}),
      ...(foto ? { foto } : {}),
      ...(!foto && opciones.eliminarFoto ? { eliminarFoto: true } : {}),
    },
  };
}
