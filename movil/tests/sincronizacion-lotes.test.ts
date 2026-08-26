import { describe, expect, it } from "vitest";

import {
  planificarLotes,
  TAMANO_LOTE_SINCRONIZACION,
} from "../src/sincronizacion/lotes";

describe("planificación de cola offline", () => {
  it("drena 501 operaciones sin superar el contrato del servidor", () => {
    expect(TAMANO_LOTE_SINCRONIZACION).toBeLessThanOrEqual(500);
    expect(planificarLotes(501)).toEqual([100, 100, 100, 100, 100, 1]);
    expect(Math.max(...planificarLotes(10_001))).toBeLessThanOrEqual(500);
  });

  it("rechaza límites fuera del contrato", () => {
    expect(() => planificarLotes(1, 501)).toThrow(/no es válida/);
    expect(() => planificarLotes(-1)).toThrow(/no es válida/);
  });
});
