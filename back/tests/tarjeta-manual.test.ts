import { TipoVenta } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { faltaTarjetaParaCredito } from "../src/modulos/ventas/reglas.js";

describe("tarjeta manual de crédito", () => {
  it("exige una tarjeta elegida por el usuario al abrir saldo", () => {
    expect(
      faltaTarjetaParaCredito({
        tipo: TipoVenta.CREDITO,
        financiado: 1_000,
      }),
    ).toBe(true);
  });

  it("acepta conservar la actual o asignar una nueva", () => {
    expect(
      faltaTarjetaParaCredito({
        tipo: TipoVenta.CREDITO,
        financiado: 1_000,
        tarjetaActual: "0042",
      }),
    ).toBe(false);
    expect(
      faltaTarjetaParaCredito({
        tipo: TipoVenta.CREDITO,
        financiado: 1_000,
        tarjetaPropuesta: "0100",
      }),
    ).toBe(false);
  });

  it("no conserva tarjetas para una venta sin saldo financiado", () => {
    expect(
      faltaTarjetaParaCredito({
        tipo: TipoVenta.CREDITO,
        financiado: 0,
      }),
    ).toBe(false);
  });
});
