import { describe, expect, it } from "vitest";

import {
  dineroNoNegativo,
  dineroPositivo,
  redondearMoneda,
  tienePrecisionMonetaria,
} from "../src/compartido/dinero.js";
import { esquemaNuevaVenta } from "../src/modulos/ventas/esquemas.js";

describe("dinero de ventas", () => {
  it("redondea resultados binarios a centavos", () => {
    expect(redondearMoneda(0.1 + 0.2)).toBe(0.3);
    expect(redondearMoneda(1990.799999999)).toBe(1990.8);
  });

  it("acepta cero, enteros y dos decimales", () => {
    expect(tienePrecisionMonetaria(0)).toBe(true);
    expect(tienePrecisionMonetaria(1990.8)).toBe(true);
    expect(tienePrecisionMonetaria(33.33)).toBe(true);
  });

  it("rechaza fracciones menores a un centavo", () => {
    expect(tienePrecisionMonetaria(10.001)).toBe(false);
  });

  it("usa el mismo contrato para todo dinero de entrada", () => {
    for (const invalido of [
      Number.POSITIVE_INFINITY,
      Number.NaN,
      10.999,
      10_000_000_000,
    ]) {
      expect(dineroNoNegativo.safeParse(invalido).success).toBe(false);
      expect(dineroPositivo.safeParse(invalido).success).toBe(false);
    }
    expect(dineroNoNegativo.parse(0)).toBe(0);
    expect(dineroPositivo.parse("10.25")).toBe(10.25);
  });

  it("el contrato rechaza anticipos y cuotas con más de dos decimales", () => {
    const base = {
      tipo: "CREDITO",
      clienteId: "7c903cb0-8981-40e7-8539-d4e562b62f76",
      anticipo: 1.001,
      items: [
        {
          productoId: "7c903cb0-8981-40e7-8539-d4e562b62f77",
          cantidad: 1,
        },
      ],
      plan: {
        periodicidad: "SEMANAL",
        montoCuota: 10,
        primerVencimiento: new Date(),
      },
    };
    expect(esquemaNuevaVenta.safeParse(base).success).toBe(false);
    expect(
      esquemaNuevaVenta.safeParse({
        ...base,
        anticipo: 1,
        plan: { ...base.plan, montoCuota: 10.999 },
      }).success,
    ).toBe(false);
  });
});
