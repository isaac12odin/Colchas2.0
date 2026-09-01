import { describe, expect, it } from "vitest";

import { rangoPeriodo } from "../src/modulos/reportes/rutas.js";

describe("rangos de reportes en la zona operativa", () => {
  it("incluye completo el mes solicitado sin desplazar una fecha ISO a agosto", () => {
    const rango = rangoPeriodo("MES", "2026-09-01");

    expect(rango.desde.toISOString()).toBe("2026-09-01T06:00:00.000Z");
    expect(rango.hasta.toISOString()).toBe("2026-10-01T05:59:59.999Z");
  });

  it("calcula bimestre, semestre y año por calendario mexicano", () => {
    expect(rangoPeriodo("BIMESTRE", "2026-01-15").desde.toISOString()).toBe(
      "2025-12-01T06:00:00.000Z",
    );
    expect(rangoPeriodo("SEMESTRE", "2026-03-31").desde.toISOString()).toBe(
      "2025-10-01T06:00:00.000Z",
    );
    const anual = rangoPeriodo("ANIO", "2026-06-15");
    expect(anual.desde.toISOString()).toBe("2026-01-01T06:00:00.000Z");
    expect(anual.hasta.toISOString()).toBe("2027-01-01T05:59:59.999Z");
  });
});
