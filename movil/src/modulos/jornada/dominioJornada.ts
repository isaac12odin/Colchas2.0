import type { Jornada, ClienteJornada } from "../../tipos";
import type { OperacionLocal } from "../../almacenLocal";
import { redondearMoneda } from "../../utilidades/dinero";
import { fechaCalendarioLocal } from "../../utilidades/fechaLocal";

export type ResultadoVisita = "PAGO" | "NO_PAGO" | "AUSENTE";
export type MetodoAbono = "EFECTIVO" | "TRANSFERENCIA" | "TARJETA" | "OTRO";

export function cuotaEsperada(cliente: ClienteJornada) {
  if (cliente.estadoCuenta) return cliente.estadoCuenta.cobrarHoy;
  const cuota = cliente.ventas?.flatMap(
    (venta) => venta.planPago?.cuotas ?? [],
  )[0];
  if (!cuota) return 0;
  const hoy = fechaCalendarioLocal();
  const fecha = cuota.fechaVence.slice(0, 10);
  return fecha <= hoy
    ? redondearMoneda(
        Math.max(0, Number(cuota.monto) - Number(cuota.montoPagado)),
      )
    : 0;
}

export function calcularResumenJornada(jornada: Jornada | null) {
  const clientes = jornada?.clientes ?? [];
  return {
    visitados: clientes.filter((cliente) => cliente.visita).length,
    totalClientes: clientes.length,
    totalPorCobrar: clientes.reduce(
      (total, cliente) => total + cuotaEsperada(cliente),
      0,
    ),
  };
}

export function crearOperacionesVisita(entrada: {
  visitaId: string;
  abonoId?: string;
  rutaId: string;
  clienteId: string;
  fechaProgramada: string;
  fechaVisita: string;
  resultado: ResultadoVisita;
  monto: number;
  metodo: MetodoAbono;
  referencia?: string;
  notas?: string;
}): OperacionLocal[] {
  const operaciones: OperacionLocal[] = [
    {
      id: entrada.visitaId,
      tipo: "VISITA",
      datos: {
        rutaId: entrada.rutaId,
        clienteId: entrada.clienteId,
        fechaProgramada: entrada.fechaProgramada,
        fechaVisita: entrada.fechaVisita,
        resultado: entrada.resultado,
        notas: entrada.notas,
      },
    },
  ];
  if (entrada.resultado === "PAGO" && entrada.abonoId) {
    operaciones.push({
      id: entrada.abonoId,
      tipo: "ABONO",
      visitaOperacionId: entrada.visitaId,
      datos: {
        clienteId: entrada.clienteId,
        monto: entrada.monto,
        metodo: entrada.metodo,
        referencia: entrada.referencia,
        notas: entrada.notas,
        fechaAbono: entrada.fechaVisita,
      },
    });
  }
  return operaciones;
}

export function aplicarVisitaLocal(
  jornada: Jornada,
  clienteId: string,
  resultado: ResultadoVisita,
  monto: number,
  fechaAbono: string,
): Jornada {
  const montoAplicado = resultado === "PAGO" ? monto : 0;
  return {
    ...jornada,
    clientes: jornada.clientes.map((cliente) =>
      cliente.id === clienteId
        ? {
            ...cliente,
            visita: { resultado },
            saldo: cliente.saldo
              ? {
                  ...cliente.saldo,
                  saldoActual: String(
                    redondearMoneda(
                      Math.max(
                        0,
                        Number(cliente.saldo.saldoActual) - montoAplicado,
                      ),
                    ),
                  ),
                }
              : cliente.saldo,
            estadoCuenta:
              cliente.estadoCuenta && montoAplicado > 0
                ? proyectarEstadoCuentaTrasAbono(
                    cliente.estadoCuenta,
                    montoAplicado,
                  )
                : cliente.estadoCuenta,
            abonos:
              resultado === "PAGO"
                ? [
                    { fechaAbono, monto: String(monto) },
                    ...(cliente.abonos ?? []),
                  ]
                : cliente.abonos,
          }
        : cliente,
    ),
  };
}

/**
 * Refleja inmediatamente un abono offline en los mismos indicadores que usa
 * la agenda. Se cubre primero lo vencido y después lo que vence hoy, igual que
 * la prioridad visual mostrada al cobrador.
 */
export function proyectarEstadoCuentaTrasAbono(
  estado: NonNullable<ClienteJornada["estadoCuenta"]>,
  monto: number,
) {
  const aplicado = redondearMoneda(
    Math.min(Math.max(0, monto), Math.max(0, estado.saldoTotal)),
  );
  const saldoTotal = redondearMoneda(Math.max(0, estado.saldoTotal - aplicado));
  const hoy = fechaCalendarioLocal();
  let restante = aplicado;
  const vencimientos = estado.vencimientos
    ? [...estado.vencimientos]
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .map((cuota) => {
          if (restante <= 0 || cuota.diferencia <= 0) return cuota;
          const abonoCuota = redondearMoneda(
            Math.min(restante, cuota.diferencia),
          );
          restante = redondearMoneda(restante - abonoCuota);
          const recibido = redondearMoneda(cuota.recibido + abonoCuota);
          const diferencia = redondearMoneda(
            Math.max(0, cuota.esperado - recibido),
          );
          return {
            ...cuota,
            recibido,
            diferencia,
            estado:
              diferencia === 0
                ? ("PAGADO" as const)
                : cuota.fecha < hoy
                  ? recibido > 0
                    ? ("PARCIAL" as const)
                    : ("VENCIDO" as const)
                  : ("PENDIENTE" as const),
          };
        })
    : undefined;
  const vencido = vencimientos
    ? redondearMoneda(
        vencimientos
          .filter((cuota) => cuota.fecha < hoy)
          .reduce((suma, cuota) => suma + cuota.diferencia, 0),
      )
    : redondearMoneda(Math.max(0, estado.vencido - aplicado));
  const aplicadoAVencido = redondearMoneda(Math.min(aplicado, estado.vencido));
  const aplicadoAHoy = redondearMoneda(
    Math.max(0, aplicado - aplicadoAVencido),
  );
  const venceHoy = vencimientos
    ? redondearMoneda(
        vencimientos
          .filter((cuota) => cuota.fecha === hoy)
          .reduce((suma, cuota) => suma + cuota.diferencia, 0),
      )
    : redondearMoneda(Math.max(0, estado.venceHoy - aplicadoAHoy));
  const cuotasVencidas = vencimientos
    ? vencimientos.filter((cuota) => cuota.fecha < hoy && cuota.diferencia > 0)
        .length
    : calcularCuotasVencidasAproximadas(estado, aplicadoAVencido, vencido);
  const proximoVencimiento = vencimientos
    ? (vencimientos.find((cuota) => cuota.fecha > hoy && cuota.diferencia > 0)
        ?.fecha ?? null)
    : estado.proximoVencimiento;
  return {
    ...estado,
    saldoTotal,
    vencido,
    venceHoy,
    cobrarHoy: redondearMoneda(Math.min(saldoTotal, vencido + venceHoy)),
    cuotasVencidas,
    proximoVencimiento,
    ...(vencimientos ? { vencimientos } : {}),
  };
}

function calcularCuotasVencidasAproximadas(
  estado: NonNullable<ClienteJornada["estadoCuenta"]>,
  aplicadoAVencido: number,
  vencidoRestante: number,
) {
  if (vencidoRestante === 0) return 0;
  if (!(estado.abonoPeriodico > 0)) return estado.cuotasVencidas;
  const liquidadas = Math.floor(
    (aplicadoAVencido + 0.005) / estado.abonoPeriodico,
  );
  return Math.max(1, estado.cuotasVencidas - liquidadas);
}

export function agregarClienteExtraordinario(
  jornada: Jornada,
  cliente: ClienteJornada,
): Jornada {
  if (jornada.clientes.some((actual) => actual.id === cliente.id))
    return jornada;
  const orden =
    Math.max(0, ...jornada.clientes.map((actual) => actual.orden)) + 1;
  return {
    ...jornada,
    clientes: [
      ...jornada.clientes,
      { ...cliente, orden, fueraDeRuta: true, visita: null },
    ],
  };
}
