export interface ClienteDetalle {
  id: string;
  nombreCompleto: string;
  telefono: string;
  direccion: string;
  numeroTarjeta: string | null;
  limiteCredito: string;
  notas: string | null;
  localidad: Localidad;
  saldo: {
    saldoActual: string;
    vencidoActual: string;
    totalCargos: string;
    totalAbonos: string;
  } | null;
  acuerdoPago: {
    periodicidad: "SEMANAL" | "QUINCENAL" | "MENSUAL";
    montoPeriodico: string;
    activo: boolean;
  } | null;
  estadoCuenta: {
    saldoTotal: number;
    abonoPeriodico: number;
    vencido: number;
    venceHoy: number;
    cobrarHoy: number;
    proximoVencimiento: string | null;
    cuotasVencidas: number;
    retardosHistoricos: number;
    diasRetardoActual: number;
    diasRetardoMaximo: number;
    vencimientos: Array<{
      cuotaId: string;
      fecha: string;
      esperado: number;
      recibido: number;
      diferencia: number;
      diasRetardo: number;
      estado: "PAGADO" | "PARCIAL" | "VENCIDO" | "PENDIENTE";
    }>;
  };
  evaluacionesRiesgo: Array<{
    nivel: string;
    puntuacion: number;
    razon: string;
    cuotasVencidas: number;
    diasMoraMaximos: number;
    porcentajePagado: string;
  }>;
  ventas: Array<{
    id: string;
    folio: string;
    estado: string;
    tipo: string;
    total: string;
    anticipo: string;
    fechaVenta: string;
    detalles: Array<{
      productoNombre: string;
      productoSku: string;
      cantidad: number;
      precioUnitario: string;
      total: string;
    }>;
    planPago: {
      periodicidad: string;
      montoCuota: string;
      cuotas: Array<{
        id: string;
        numero: number;
        fechaVence: string;
        monto: string;
        montoPagado: string;
        estado: string;
        pagadaEn: string | null;
      }>;
    } | null;
    devoluciones: Array<{
      id: string;
      folio: string;
      totalDevuelto: string;
    }>;
  }>;
  abonos: Array<{
    id: string;
    monto: string;
    metodo: string;
    fechaAbono: string;
    referencia: string | null;
    anuladoEn: string | null;
    motivoAnulacion: string | null;
    anuladoPor: { nombre: string } | null;
  }>;
  pedidos: Array<{
    id: string;
    folio: string;
    estado: string;
    fechaCompromiso: string | null;
    creadoEn: string;
    venta: { folio: string } | null;
    items: Array<{
      descripcion: string;
      cantidad: number;
      precioEstimado: string;
      proveedor: { nombre: string } | null;
    }>;
  }>;
  movimientosSaldo: Array<{
    id: string;
    tipo: string;
    monto: string;
    saldoAnterior: string;
    saldoNuevo: string;
    concepto: string;
    creadoEn: string;
  }>;
}

export interface Localidad {
  id: string;
  nombre: string;
  estado: string;
}

export type AbonoCliente = ClienteDetalle["abonos"][number];
