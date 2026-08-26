import { fechaMexicoISO } from "../../compartido/fechas.js";
import { redondearMoneda } from "../../compartido/dinero.js";

export interface CuotaEstadoCuenta {
  id: string;
  fechaVence: Date;
  monto: number;
  montoPagado: number;
  pagadaEn?: Date | null;
}

export interface EstadoCuentaCliente {
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
}

function diasEntre(inicio: string, fin: string) {
  const milisegundos =
    Date.parse(`${fin}T00:00:00.000Z`) - Date.parse(`${inicio}T00:00:00.000Z`);
  return Math.max(0, Math.floor(milisegundos / 86_400_000));
}

export function calcularEstadoCuenta(
  entrada: {
    saldoTotal: number;
    vencidoRegistrado?: number | null;
    abonoPeriodico?: number | null;
    cuotas: readonly CuotaEstadoCuenta[];
  },
  fechaCorte = new Date(),
): EstadoCuentaCliente {
  const hoy = fechaMexicoISO(fechaCorte);
  const saldoTotal = redondearMoneda(Math.max(0, entrada.saldoTotal));
  const vencimientos = entrada.cuotas
    .map((cuota) => {
      const fecha = fechaMexicoISO(cuota.fechaVence);
      const esperado = redondearMoneda(Number(cuota.monto));
      const recibido = redondearMoneda(
        Math.min(esperado, Math.max(0, Number(cuota.montoPagado))),
      );
      const diferencia = redondearMoneda(Math.max(0, esperado - recibido));
      const fechaLiquidacion = cuota.pagadaEn
        ? fechaMexicoISO(cuota.pagadaEn)
        : hoy;
      const diasRetardo =
        fecha < fechaLiquidacion ? diasEntre(fecha, fechaLiquidacion) : 0;
      const estado =
        diferencia === 0
          ? "PAGADO"
          : fecha < hoy
            ? recibido > 0
              ? "PARCIAL"
              : "VENCIDO"
            : "PENDIENTE";
      return {
        cuotaId: cuota.id,
        fecha,
        esperado,
        recibido,
        diferencia,
        diasRetardo,
        estado,
      } as const;
    })
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  const vencidas = vencimientos.filter(
    (cuota) => cuota.fecha < hoy && cuota.diferencia > 0,
  );
  const vencidoCalculado = vencidas.reduce(
    (suma, cuota) => suma + cuota.diferencia,
    0,
  );
  const vencido = redondearMoneda(
    Math.min(
      saldoTotal,
      entrada.cuotas.length
        ? vencidoCalculado
        : Math.max(0, entrada.vencidoRegistrado ?? 0),
    ),
  );
  const venceHoy = redondearMoneda(
    vencimientos
      .filter((cuota) => cuota.fecha === hoy)
      .reduce((suma, cuota) => suma + cuota.diferencia, 0),
  );
  const proximo = vencimientos.find(
    (cuota) => cuota.fecha > hoy && cuota.diferencia > 0,
  );
  const retardos = vencimientos.filter((cuota) => cuota.diasRetardo > 0);

  return {
    saldoTotal,
    abonoPeriodico: redondearMoneda(Math.max(0, entrada.abonoPeriodico ?? 0)),
    vencido,
    venceHoy,
    cobrarHoy: redondearMoneda(Math.min(saldoTotal, vencido + venceHoy)),
    proximoVencimiento: proximo?.fecha ?? null,
    cuotasVencidas: vencidas.length,
    retardosHistoricos: retardos.length,
    diasRetardoActual: vencidas.reduce(
      (maximo, cuota) => Math.max(maximo, cuota.diasRetardo),
      0,
    ),
    diasRetardoMaximo: retardos.reduce(
      (maximo, cuota) => Math.max(maximo, cuota.diasRetardo),
      0,
    ),
    vencimientos,
  };
}
