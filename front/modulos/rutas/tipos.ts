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
  visita: { resultado: string } | null;
  pedidos: Array<{
    folio: string;
    items: Array<{ descripcion: string; cantidad: number }>;
  }>;
  ventas: Array<{
    planPago: { cuotas: Array<{ monto: string; montoPagado: string }> } | null;
  }>;
  evaluacionesRiesgo: Array<{ nivel: string }>;
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
