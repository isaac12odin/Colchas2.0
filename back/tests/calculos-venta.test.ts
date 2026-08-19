import { PeriodicidadPago } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  calcularFechaCuota,
  generarCuotas,
} from "../src/modulos/ventas/calculos.js";

describe("cálculos de venta a crédito", () => {
  it("ajusta la última cuota sin cobrar de más", () => {
    const cuotas = generarCuotas(1_000, {
      periodicidad: PeriodicidadPago.SEMANAL,
      montoCuota: 300,
      primerVencimiento: new Date("2026-08-24T12:00:00.000Z"),
    });

    expect(cuotas.map((cuota) => cuota.monto)).toEqual([300, 300, 300, 100]);
    expect(cuotas.reduce((total, cuota) => total + cuota.monto, 0)).toBe(1_000);
  });

  it("respeta intervalos semanales, quincenales y mensuales", () => {
    const inicio = new Date("2026-01-10T12:00:00.000Z");
    expect(
      calcularFechaCuota(inicio, PeriodicidadPago.SEMANAL, 2).toISOString(),
    ).toContain("2026-01-24");
    expect(
      calcularFechaCuota(inicio, PeriodicidadPago.QUINCENAL, 2).toISOString(),
    ).toContain("2026-02-09");
    expect(
      calcularFechaCuota(inicio, PeriodicidadPago.MENSUAL, 2).toISOString(),
    ).toContain("2026-03-10");
  });
});
