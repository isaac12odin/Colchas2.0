import { describe, expect, it } from "vitest";

import {
  asegurarUrlBasePruebas,
  resolverUrlBasePruebas,
} from "../scripts/base-pruebas.js";

describe("aislamiento de la base E2E", () => {
  it("deriva una base hermana terminada en _test", () => {
    const resultado = new URL(
      resolverUrlBasePruebas({
        DATABASE_URL:
          "postgresql://nexo:clave@127.0.0.1:55433/nexo_cobranza?schema=public",
      } as NodeJS.ProcessEnv),
    );
    expect(nombreResultado(resultado)).toBe("nexo_cobranza_test");
    expect(resultado.searchParams.get("schema")).toBe("public");
  });

  it("acepta una E2E_DATABASE_URL explícita sólo si termina en _test", () => {
    expect(() =>
      resolverUrlBasePruebas({
        DATABASE_URL: "postgresql://localhost/nexo_cobranza",
        E2E_DATABASE_URL: "postgresql://localhost/nexo_cobranza",
      } as NodeJS.ProcessEnv),
    ).toThrow(/terminada en _test/);
    expect(
      new URL(
        resolverUrlBasePruebas({
          E2E_DATABASE_URL: "postgresql://localhost/nexo_integracion_test",
        } as NodeJS.ProcessEnv),
      ).pathname,
    ).toBe("/nexo_integracion_test");
  });

  it("rechaza nombres ambiguos o manipulados", () => {
    expect(() =>
      asegurarUrlBasePruebas("postgresql://localhost/nexo-test"),
    ).toThrow(/terminada en _test/);
    expect(() =>
      asegurarUrlBasePruebas("postgresql://localhost/nexo%20_test"),
    ).toThrow(/caracteres no permitidos/);
  });
});

function nombreResultado(url: URL) {
  return decodeURIComponent(url.pathname.slice(1));
}
