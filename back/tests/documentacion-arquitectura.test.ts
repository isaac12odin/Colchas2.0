import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const decisiones = readFileSync(
  new URL("../../docs/DECISIONES_ARQUITECTURA.md", import.meta.url),
  "utf8",
);
const deuda = readFileSync(
  new URL("../../docs/DEUDA_TECNICA.md", import.meta.url),
  "utf8",
);
const guia = readFileSync(
  new URL("../../docs/GUIA_DESARROLLO.md", import.meta.url),
  "utf8",
);
const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

function extraerEntrada(documento: string, id: string) {
  const inicio = documento.indexOf(`## ${id}`);
  expect(inicio, `Falta ${id}`).toBeGreaterThan(-1);
  const siguiente = documento.indexOf("\n## ", inicio + 4);
  return documento.slice(inicio, siguiente === -1 ? undefined : siguiente);
}

describe("gobierno de arquitectura y deuda técnica", () => {
  it("conserva contexto, motivo, consecuencias e invariantes en cada ADR", () => {
    for (let numero = 1; numero <= 12; numero += 1) {
      const id = `ADR-${String(numero).padStart(3, "0")}`;
      const entrada = extraerEntrada(decisiones, id);
      expect(entrada).toContain("**Estado:**");
      expect(entrada).toContain("### Contexto");
      expect(entrada).toContain("### Decisión");
      expect(entrada).toContain("### Motivo");
      expect(entrada).toContain("### Consecuencias");
      expect(entrada).toContain("### Invariantes");
      expect(entrada).toContain("### Revisar cuando");
    }
  });

  it("exige que cada deuda tenga riesgo, contención, disparador y salida", () => {
    for (let numero = 1; numero <= 14; numero += 1) {
      const id = `DT-${String(numero).padStart(3, "0")}`;
      const entrada = extraerEntrada(deuda, id);
      expect(entrada).toContain("**Prioridad/estado:**");
      expect(entrada).toContain("**Riesgo:**");
      expect(entrada).toContain("**Contención actual:**");
      expect(entrada).toContain("**Disparador:**");
      expect(entrada).toContain("**Criterio de salida:**");
    }
  });

  it("hace visibles ambos registros desde el inicio y la guía de desarrollo", () => {
    expect(readme).toContain("docs/DECISIONES_ARQUITECTURA.md");
    expect(readme).toContain("docs/DEUDA_TECNICA.md");
    expect(guia).toContain("DECISIONES_ARQUITECTURA.md");
    expect(guia).toContain("DEUDA_TECNICA.md");
  });
});
