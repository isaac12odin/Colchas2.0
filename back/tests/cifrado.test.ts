import { describe, expect, it } from "vitest";
import {
  cifrarCampo,
  descifrarCampo,
  hashBusqueda,
  normalizarTelefono,
} from "../src/compartido/cifrado.js";

describe("proteccion de datos personales", () => {
  it("cifra con valores distintos y recupera el original", () => {
    const original = "Calle 5, numero 10";
    const primero = cifrarCampo(original);
    const segundo = cifrarCampo(original);
    expect(primero).not.toBe(segundo);
    expect(descifrarCampo(primero)).toBe(original);
    expect(descifrarCampo(segundo)).toBe(original);
  });

  it("normaliza y produce un hash estable para busqueda exacta", () => {
    expect(normalizarTelefono("+52 (55) 1234-5678")).toBe("525512345678");
    expect(hashBusqueda("525512345678")).toBe(hashBusqueda("525512345678"));
    expect(hashBusqueda("525512345678")).not.toContain("525512345678");
  });
});
