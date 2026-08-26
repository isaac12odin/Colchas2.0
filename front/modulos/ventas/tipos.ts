export interface VentaWeb {
  id: string;
  folio: string;
  fechaVenta: string;
  tipo: string;
  total: string;
  anticipo: string;
  cliente: { nombreCompleto: string } | null;
  usuario: { nombre: string };
}

export type TipoVentaWeb = "CREDITO" | "CONTADO" | "PUBLICO";
export type MetodoPagoWeb = "EFECTIVO" | "TRANSFERENCIA" | "TARJETA" | "OTRO";

export interface NuevaVentaWeb {
  idOperacionMovil: string;
  clienteId?: string | null;
  numeroTarjeta?: string;
  tipo: TipoVentaWeb;
  descuento: number;
  anticipo: number;
  metodoAnticipo: MetodoPagoWeb;
  fechaVenta: string;
  items: Array<{ productoId: string; cantidad: number }>;
  plan?: {
    periodicidad: "SEMANAL" | "QUINCENAL" | "MENSUAL";
    montoCuota: number;
    primerVencimiento: string;
  };
}

export interface ResultadoVentaWeb {
  id: string;
  folio: string;
  total: string | number;
  resumenSaldo: {
    clienteId: string;
    saldoAnterior: number;
    cargoVenta: number;
    anticipo: number;
    saldoNuevo: number;
  } | null;
  idempotente: boolean;
}

export interface VentaDetalleWeb extends VentaWeb {
  detalles: Array<{
    id: string;
    productoNombre: string;
    productoSku: string;
    productoMarca: string;
    cantidad: number;
    precioUnitario: string;
    costoUnitario?: string;
    total: string;
  }>;
  abonos: Array<{
    id: string;
    monto: string;
    metodo: string;
    fechaAbono: string;
    notas?: string | null;
  }>;
  planPago: {
    periodicidad: string;
    numeroCuotas: number;
    montoCuota: string;
    cuotas: Array<{
      numero: number;
      fechaVence: string;
      monto: string;
      montoPagado: string;
      estado: string;
    }>;
  } | null;
}
