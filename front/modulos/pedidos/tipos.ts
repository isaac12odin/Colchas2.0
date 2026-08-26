export interface PedidoWeb {
  id: string;
  folio: string;
  estado: string;
  fechaCompromiso: string | null;
  cliente: {
    id: string;
    nombreCompleto: string;
    numeroTarjeta?: string | null;
  };
  items: Array<{
    id: string;
    descripcion: string;
    cantidad: number;
    precioEstimado: string;
    producto: { id: string; nombre: string; sku: string } | null;
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
  saldo?: { saldoActual: string; vencidoActual?: string } | null;
  acuerdoPago?: {
    periodicidad: "SEMANAL" | "QUINCENAL" | "MENSUAL";
    montoPeriodico: string;
    activo: boolean;
  } | null;
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
  tieneFoto?: boolean;
  fotoActualizadaEn?: string | null;
}

export interface DatosEntregaPedidoWeb {
  tipo: "CREDITO" | "CONTADO";
  numeroTarjeta?: string;
  anticipo: number;
  metodoAnticipo: "EFECTIVO" | "TRANSFERENCIA" | "TARJETA" | "OTRO";
  plan?: {
    periodicidad: "SEMANAL" | "QUINCENAL" | "MENSUAL";
    montoCuota: number;
    primerVencimiento: string;
  };
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

export const etiquetaEstadoPedido: Record<string, string> = {
  PENDIENTE_PEDIR: "Pendiente de pedir",
  PEDIDO_PROVEEDOR: "Pedido al proveedor",
  RECIBIDO_ALMACEN: "Recibido en almacén",
  LISTO_ENTREGA: "Listo para entregar",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

export const etiquetaEstadoPedidoEn: Record<string, string> = {
  PENDIENTE_PEDIR: "Pending supplier",
  PEDIDO_PROVEEDOR: "Ordered from supplier",
  RECIBIDO_ALMACEN: "Received in warehouse",
  LISTO_ENTREGA: "Ready to deliver",
  ENTREGADO: "Delivered",
  CANCELADO: "Cancelled",
};
