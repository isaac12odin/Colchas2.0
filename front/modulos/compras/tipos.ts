import type { ProductoPedido } from "@/modulos/pedidos/tipos";

export interface ProveedorCompra {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface PedidoPendienteCompra {
  id: string;
  folio: string;
  items: Array<{
    id: string;
    producto: { id: string; nombre: string; sku: string } | null;
  }>;
}

export interface LineaCompra {
  id: string;
  producto: ProductoPedido | null;
  cantidad: string;
  costo: string;
  itemPedidoId: string;
}

export interface NuevaCompraWeb {
  proveedorId: string;
  fechaCompra: string;
  notas?: string;
  items: Array<{
    productoId: string;
    cantidad: number;
    costoUnitario: number;
    itemPedidoId?: string;
  }>;
}
