export interface RutaWeb {
  id: string;
  nombre: string;
  diaSemana: string;
  notas?: string | null;
  cobradorId?: string | null;
  cobrador?: { id: string; nombre: string; correo: string } | null;
  localidades: Array<{
    localidad: { id: string; nombre: string; estado?: string };
  }>;
  clientes?: Array<{
    clienteId: string;
    orden: number;
    cliente: {
      id: string;
      nombreCompleto: string;
      numeroTarjeta?: string | null;
      localidadId: string;
      localidad: { id: string; nombre: string; estado?: string };
      saldo: { saldoActual: string } | null;
      estadoCuenta?: EstadoCuentaWeb;
    };
  }>;
  _count: { clientes: number };
}

export interface ClienteJornadaWeb {
  id: string;
  nombreCompleto: string;
  numeroTarjeta?: string | null;
  telefono: string;
  direccion: string;
  localidad?: { nombre: string; estado?: string };
  orden: number;
  fueraDeRuta?: boolean;
  saldo: { saldoActual: string } | null;
  estadoCuenta: EstadoCuentaWeb;
  visita: {
    resultado: string | null;
    motivoNoCobro?: string | null;
    promesaPagoFecha?: string | null;
    promesaPagoMonto?: string | null;
    abonos?: Array<{ monto: string }>;
  } | null;
  pedidos: Array<{
    folio: string;
    items: Array<{ descripcion: string; cantidad: number }>;
  }>;
  ventas: Array<{
    planPago: { cuotas: Array<{ monto: string; montoPagado: string }> } | null;
  }>;
  evaluacionesRiesgo: Array<{ nivel: string }>;
}

export interface EstadoCuentaWeb {
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
}

export interface JornadaWeb {
  id: string;
  nombre: string;
  fecha: string;
  localidades?: Array<{
    id: string;
    nombre: string;
    estado: string;
    orden: number;
  }>;
  clientes: ClienteJornadaWeb[];
}
