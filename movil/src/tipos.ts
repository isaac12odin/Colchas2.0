export type Rol =
  | "ADMINISTRADOR"
  | "CONTABLE"
  | "VENDEDOR"
  | "ALMACENISTA"
  | "COBRADOR";
export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  debeCambiarContrasena: boolean;
  mfaHabilitado: boolean;
}
export interface Ruta {
  id: string;
  nombre: string;
  diaSemana: string;
  _count: { clientes: number };
  localidades: Array<{ localidad: { nombre: string } }>;
}
export interface ProductoMovil {
  id: string;
  sku: string;
  nombre: string;
  marca: string;
  categoria?: string | null;
  codigoBarras?: string | null;
  codigoQr?: string | null;
  existencia: number;
  precioVenta: string;
  tieneFoto?: boolean;
  fotoActualizadaEn?: string | null;
  actualizadoEn: string;
}
export interface ItemPedidoMovil {
  id: string;
  descripcion: string;
  cantidad: number;
  precioEstimado: string;
  productoId?: string | null;
  producto?: { nombre: string } | null;
  proveedor?: { id: string; nombre: string } | null;
}
export interface ProveedorMovil {
  id: string;
  nombre: string;
}
export interface PedidoMovil {
  id: string;
  folio: string;
  estado: string;
  fechaCompromiso?: string | null;
  clienteId?: string;
  cliente?: {
    id?: string;
    nombreCompleto: string;
    numeroTarjeta?: string | null;
  };
  items: ItemPedidoMovil[];
}

export interface ClientePedidoMovil {
  id: string;
  nombreCompleto: string;
  telefono: string;
  direccion: string;
  numeroTarjeta?: string | null;
  localidad?: { nombre: string };
}
export interface ClienteJornada {
  id: string;
  nombreCompleto: string;
  numeroTarjeta?: string | null;
  telefono: string;
  direccion: string;
  localidad?: { id?: string; nombre: string; estado?: string };
  orden: number;
  fueraDeRuta?: boolean;
  saldo: { saldoActual: string } | null;
  visita: { resultado: string } | null;
  pedidos: PedidoMovil[];
  ventas: Array<{
    planPago: {
      periodicidad: string;
      montoCuota: string;
      cuotas: Array<{ monto: string; montoPagado: string; fechaVence: string }>;
    } | null;
  }>;
  abonos: Array<{ fechaAbono: string; monto: string }>;
  evaluacionesRiesgo: Array<{ nivel: string; puntuacion?: number }>;
  estadoCuenta?: {
    saldoTotal: number;
    abonoPeriodico: number;
    vencido: number;
    venceHoy: number;
    cobrarHoy: number;
    proximoVencimiento: string | null;
    cuotasVencidas: number;
    retardosHistoricos?: number;
    diasRetardoActual?: number;
    diasRetardoMaximo?: number;
    vencimientos?: Array<{
      cuotaId: string;
      fecha: string;
      esperado: number;
      recibido: number;
      diferencia: number;
      diasRetardo: number;
      estado: "PAGADO" | "PARCIAL" | "VENCIDO" | "PENDIENTE";
    }>;
  };
}
export interface Jornada {
  id: string;
  nombre: string;
  fecha: string;
  clientes: ClienteJornada[];
  guardadaEn?: string;
}
