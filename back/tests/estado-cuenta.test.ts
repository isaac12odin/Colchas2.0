import { describe, expect, it } from "vitest";

import { calcularEstadoCuenta } from "../src/modulos/cobranza/estadoCuenta.js";

describe("estado de cuenta y retardos", () => {
  it("separa saldo, vencido y dinero realmente recibido", () => {
    const antesDelAbono = calcularEstadoCuenta(
      {
        saldoTotal: 710,
        abonoPeriodico: 100,
        cuotas: [
          {
            id: "semana-1",
            fechaVence: new Date("2026-08-18T12:00:00-06:00"),
            monto: 100,
            montoPagado: 0,
          },
          {
            id: "semana-2",
            fechaVence: new Date("2026-08-25T12:00:00-06:00"),
            monto: 100,
            montoPagado: 0,
          },
        ],
      },
      new Date("2026-08-25T14:00:00-06:00"),
    );
    const estado = calcularEstadoCuenta(
      {
        saldoTotal: 650,
        abonoPeriodico: 100,
        cuotas: [
          {
            id: "semana-1",
            fechaVence: new Date("2026-08-18T12:00:00-06:00"),
            monto: 100,
            montoPagado: 60,
          },
          {
            id: "semana-2",
            fechaVence: new Date("2026-08-25T12:00:00-06:00"),
            monto: 100,
            montoPagado: 0,
          },
        ],
      },
      new Date("2026-08-25T14:00:00-06:00"),
    );

    expect(antesDelAbono.cobrarHoy).toBe(200);
    expect(estado.saldoTotal).toBe(650);
    expect(estado.vencido).toBe(40);
    expect(estado.venceHoy).toBe(100);
    expect(estado.cobrarHoy).toBe(140);
    expect(estado.diasRetardoActual).toBe(7);
    expect(estado.vencimientos[0]).toMatchObject({
      esperado: 100,
      recibido: 60,
      diferencia: 40,
      estado: "PARCIAL",
    });
  });

  it("nunca cobra más que el saldo ni duplica el atraso como cargo", () => {
    const estado = calcularEstadoCuenta(
      {
        saldoTotal: 120,
        abonoPeriodico: 100,
        cuotas: [
          {
            id: "atrasada",
            fechaVence: new Date("2026-08-18T12:00:00-06:00"),
            monto: 100,
            montoPagado: 0,
          },
          {
            id: "actual",
            fechaVence: new Date("2026-08-25T12:00:00-06:00"),
            monto: 100,
            montoPagado: 0,
          },
        ],
      },
      new Date("2026-08-25T14:00:00-06:00"),
    );

    expect(estado.vencido + estado.venceHoy).toBe(200);
    expect(estado.cobrarHoy).toBe(120);
  });
});
