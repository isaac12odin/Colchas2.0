import type { Jornada, ClienteJornada } from "../../tipos";
import type { OperacionLocal } from "../../almacenLocal";
import { redondearMoneda } from "../../utilidades/dinero";

export type ResultadoVisita = "PAGO" | "NO_PAGO" | "AUSENTE";
export type MetodoAbono = "EFECTIVO" | "TRANSFERENCIA";

export function cuotaEsperada(cliente: ClienteJornada) {
  if (cliente.estadoCuenta) return cliente.estadoCuenta.cobrarHoy;
  const cuota = cliente.ventas?.flatMap(
    (venta) => venta.planPago?.cuotas ?? [],
  )[0];
  if (!cuota) return 0;
  const hoy = new Date().toISOString().slice(0, 10);
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
                      Math.max(0, Number(cliente.saldo.saldoActual) - monto),
                    ),
                  ),
                }
              : cliente.saldo,
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
