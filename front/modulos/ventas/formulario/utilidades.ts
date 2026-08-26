import type { ProductoPedido } from "@/modulos/pedidos/tipos";

export interface LineaVentaFormulario {
  producto: ProductoPedido;
  cantidad: number;
}

export const dineroVenta = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export function fechaSiguienteSemana() {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + 7);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

export function subtotalLineas(lineas: LineaVentaFormulario[]) {
  return lineas.reduce(
    (suma, linea) => suma + Number(linea.producto.precioVenta) * linea.cantidad,
    0,
  );
}

export function urlFotoVenta(producto: ProductoPedido) {
  if (!producto.tieneFoto) return null;
  const version = producto.fotoActualizadaEn
    ? `?v=${encodeURIComponent(producto.fotoActualizadaEn)}`
    : "";
  return `/api/inventario/productos/${producto.id}/foto${version}`;
}
