export interface LocalidadRuta {
  id: string;
  nombre: string;
  estado: string;
}

export interface CobradorRuta {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
  activo: boolean;
}

export interface EstadoCuentaRuta {
  saldoTotal: number;
  abonoPeriodico: number;
  vencido: number;
  venceHoy: number;
  cobrarHoy: number;
  proximoVencimiento: string | null;
  cuotasVencidas: number;
  diasRetardoActual: number;
}

export interface ClienteRuta {
  id: string;
  nombreCompleto: string;
  numeroTarjeta?: string | null;
  localidadId: string;
  localidad: LocalidadRuta;
  saldo: { saldoActual: string; vencidoActual?: string } | null;
  estadoCuenta: EstadoCuentaRuta;
  evaluacionesRiesgo: Array<{ nivel: string }>;
}

export type CriterioOrdenRuta = "LOCALIDAD" | "VENCIDOS";
