export interface PedidoWeb {
  id: string;
  folio: string;
  estado: string;
  fechaCompromiso: string | null;
  cliente: { nombreCompleto: string; numeroTarjeta?: string | null };
  items: Array<{
    id: string;
    descripcion: string;
    cantidad: number;
    precioEstimado: string;
    producto: { nombre: string } | null;
    proveedor: { id: string; nombre: string } | null;
  }>;
}

export interface ClientePedido {
  id: string;
  nombreCompleto: string;
  telefono: string;
  direccion: string;
  numeroTarjeta?: string | null;
  localidad?: { nombre: string; estado: string };
}

export interface ProductoPedido {
  id: string;
  nombre: string;
  sku: string;
  marca: string;
  codigoBarras?: string | null;
  existencia: number;
  precioVenta: string;
  precioCompra?: string;
}

export const estadosPedido = [
  "",
  "PENDIENTE_PEDIR",
  "PEDIDO_PROVEEDOR",
  "RECIBIDO_ALMACEN",
  "LISTO_ENTREGA",
  "ENTREGADO",
];

export const siguienteEstado: Record<string, string> = {
  PENDIENTE_PEDIR: "PEDIDO_PROVEEDOR",
  PEDIDO_PROVEEDOR: "RECIBIDO_ALMACEN",
  RECIBIDO_ALMACEN: "LISTO_ENTREGA",
};

export const etiquetaSiguiente: Record<string, string> = {
  PEDIDO_PROVEEDOR: "Marcar pedido",
  RECIBIDO_ALMACEN: "Marcar recibido",
  LISTO_ENTREGA: "Listo para entrega",
};
