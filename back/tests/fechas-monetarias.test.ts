import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  MAXIMA_ANTIGUEDAD_OPERACION_MS,
  MAXIMO_ADELANTO_RELOJ_MS,
  contextoFechaOperacion,
  fechaISODesdeDateDb,
  requiereAlertaReloj,
  validarFechaMonetaria,
  validarPrimerVencimiento,
} from "../src/compartido/fechas.js";
import { hashBusqueda } from "../src/compartido/cifrado.js";

describe("autoridad temporal e índices privados", () => {
  it("acepta trabajo offline reciente y rechaza fechas manipuladas", () => {
    const ahora = new Date("2026-08-20T12:00:00.000Z");
    expect(
      validarFechaMonetaria(
        new Date(ahora.getTime() - MAXIMA_ANTIGUEDAD_OPERACION_MS + 1),
        ahora,
      ),
    ).toBeInstanceOf(Date);
    expect(() =>
      validarFechaMonetaria(
        new Date(ahora.getTime() - MAXIMA_ANTIGUEDAD_OPERACION_MS - 1),
        ahora,
      ),
    ).toThrow(/36 horas/);
    expect(() =>
      validarFechaMonetaria(
        new Date(ahora.getTime() + MAXIMO_ADELANTO_RELOJ_MS + 1),
        ahora,
      ),
    ).toThrow(/adelantada/);
  });

  it("impide que el primer vencimiento anteceda a la operación", () => {
    const venta = new Date("2026-08-20T12:00:00.000Z");
    expect(() =>
      validarPrimerVencimiento(venta, new Date("2026-08-19T12:00:00.000Z")),
    ).toThrow(/anterior/);
    expect(
      validarPrimerVencimiento(venta, new Date("2026-08-27T12:00:00.000Z")),
    ).toBeInstanceOf(Date);
  });

  it("el índice exacto no es el SHA-256 predecible del teléfono", () => {
    const telefono = "5551234567";
    const sha = createHash("sha256").update(telefono).digest("hex");
    expect(hashBusqueda(telefono)).toHaveLength(64);
    expect(hashBusqueda(telefono)).not.toBe(sha);
    expect(hashBusqueda(` ${telefono} `)).toBe(hashBusqueda(telefono));
  });

  it("el servidor fija la fecha operativa aunque el teléfono esté en otra zona", () => {
    const contexto = contextoFechaOperacion(
      new Date("2026-08-19T23:50:00.000-07:00"),
      new Date("2026-08-20T07:20:00.000Z"),
    );
    expect(fechaISODesdeDateDb(contexto.fechaOperativa)).toBe("2026-08-20");
    expect(requiereAlertaReloj(contexto.diferenciaRelojSegundos)).toBe(false);
    expect(
      requiereAlertaReloj(
        contextoFechaOperacion(
          new Date("2026-08-19T20:00:00.000Z"),
          new Date("2026-08-20T06:20:00.000Z"),
        ).diferenciaRelojSegundos,
      ),
    ).toBe(true);
  });
});
