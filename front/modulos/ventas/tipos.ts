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
