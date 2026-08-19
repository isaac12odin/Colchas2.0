import { describe, expect, it } from "vitest";
import {
  crearPagina,
  esquemaPaginacion,
} from "../src/compartido/paginacion.js";

describe("paginacion consistente", () => {
  it("aplica limites seguros y calcula las paginas", () => {
    const entrada = esquemaPaginacion.parse({ pagina: "2", limite: "20" });
    expect(entrada).toEqual({ pagina: 2, limite: 20 });
    expect(crearPagina(["a"], 41, 2, 20).paginacion.totalPaginas).toBe(3);
  });

  it("rechaza limites excesivos", () => {
    expect(() => esquemaPaginacion.parse({ limite: 1000 })).toThrow();
  });
});
