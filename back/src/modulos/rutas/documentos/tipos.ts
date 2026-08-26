export type TipoDocumentoRuta = "HOJA" | "RESULTADO";

export interface ClienteDocumentoRuta {
  orden: number;
  nombreCompleto: string;
  numeroTarjeta: string | null;
  localidad: string;
  direccion: string;
  telefono: string;
  saldo: number;
  abonoAcordado: number;
  vencido: number;
  cobrarHoy: number;
  diasRetardo: number;
  resultado: string | null;
  montoRecibido: number;
  diferencia: number;
  motivoNoCobro: string | null;
  promesaPagoFecha: Date | null;
  promesaPagoMonto: number | null;
  fueraDeRuta: boolean;
}

export interface DatosDocumentoRuta {
  rutaId: string;
  nombre: string;
  fecha: Date;
  cobrador: string;
  localidades: string[];
  clientes: ClienteDocumentoRuta[];
  totales: {
    saldo: number;
    vencido: number;
    cobrarHoy: number;
    recibido: number;
    diferencia: number;
  };
}
