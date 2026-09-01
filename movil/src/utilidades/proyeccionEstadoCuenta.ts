import type { ClienteJornada } from "../tipos";
import { redondearMoneda } from "./dinero";
import { fechaCalendarioLocal } from "./fechaLocal";

type EstadoCuenta = NonNullable<ClienteJornada["estadoCuenta"]>;

export interface PlanCreditoProyectado {
  periodicidad: "SEMANAL" | "QUINCENAL" | "MENSUAL";
  montoCuota: number;
  primerVencimiento: string;
}

function siguienteFecha(
  fecha: string,
  periodicidad: PlanCreditoProyectado["periodicidad"],
) {
  const [ano, mes, dia] = fecha.split("-").map(Number);
  const siguiente = new Date(ano, mes - 1, dia, 12, 0, 0, 0);
  if (periodicidad === "SEMANAL") siguiente.setDate(siguiente.getDate() + 7);
  else if (periodicidad === "QUINCENAL")
    siguiente.setDate(siguiente.getDate() + 15);
  else siguiente.setMonth(siguiente.getMonth() + 1);
  return fechaCalendarioLocal(siguiente);
}

/**
 * Proyecta en la agenda la primera deuda de un cliente sin inventar un acuerdo
 * distinto cuando ya existía deuda. El servidor seguirá siendo la fuente
 * definitiva al sincronizar, pero el cobrador ve de inmediato lo que vence hoy.
 */
export function proyectarEstadoCuentaTrasCargo(
  estado: EstadoCuenta | undefined,
  saldoAnterior: number,
  montoFinanciado: number,
  plan?: PlanCreditoProyectado,
  hoy = fechaCalendarioLocal(),
): EstadoCuenta | undefined {
  if (montoFinanciado <= 0) return estado;

  const base: EstadoCuenta = estado ?? {
    saldoTotal: redondearMoneda(Math.max(0, saldoAnterior)),
    abonoPeriodico: 0,
    vencido: 0,
    venceHoy: 0,
    cobrarHoy: 0,
    proximoVencimiento: null,
    cuotasVencidas: 0,
  };
  const saldoTotal = redondearMoneda(base.saldoTotal + montoFinanciado);
  const yaTeniaDeuda = base.saldoTotal > 0;

  if (!plan || yaTeniaDeuda || !(plan.montoCuota > 0)) {
    return { ...base, saldoTotal };
  }

  const nuevasCuotas: NonNullable<EstadoCuenta["vencimientos"]> = [];
  let restante = redondearMoneda(montoFinanciado);
  let fecha = plan.primerVencimiento;
  let numero = 1;
  while (restante > 0 && numero <= 1000) {
    const esperado = redondearMoneda(Math.min(restante, plan.montoCuota));
    nuevasCuotas.push({
      cuotaId: `local-nueva-${numero}`,
      fecha,
      esperado,
      recibido: 0,
      diferencia: esperado,
      diasRetardo: 0,
      estado: fecha < hoy ? "VENCIDO" : "PENDIENTE",
    });
    restante = redondearMoneda(restante - esperado);
    fecha = siguienteFecha(fecha, plan.periodicidad);
    numero += 1;
  }

  const venceHoy = redondearMoneda(
    base.venceHoy +
      nuevasCuotas
        .filter((cuota) => cuota.fecha === hoy)
        .reduce((suma, cuota) => suma + cuota.diferencia, 0),
  );
  const proximoNuevo = nuevasCuotas.find((cuota) => cuota.fecha > hoy)?.fecha;
  const proximos = [base.proximoVencimiento, proximoNuevo]
    .filter((valor): valor is string => Boolean(valor))
    .sort();

  return {
    ...base,
    saldoTotal,
    abonoPeriodico: redondearMoneda(plan.montoCuota),
    venceHoy,
    cobrarHoy: redondearMoneda(Math.min(saldoTotal, base.vencido + venceHoy)),
    proximoVencimiento: proximos[0] ?? null,
    vencimientos: [...(base.vencimientos ?? []), ...nuevasCuotas],
  };
}
