import { describe, expect, it } from "vitest";

import { esRutaSalud, requiereHttps } from "../src/seguridad/https.js";

describe("HTTPS en producción", () => {
  it("permite la salud básica y sus subrutas dentro de la red privada", () => {
    expect(esRutaSalud("/salud")).toBe(true);
    expect(esRutaSalud("/salud/listo")).toBe(true);
    expect(
      requiereHttps({
        produccion: true,
        conexionSegura: false,
        ruta: "/salud/listo",
      }),
    ).toBe(false);
  });

  it("no confunde rutas con prefijos parecidos con una ruta de salud", () => {
    expect(esRutaSalud("/saludable")).toBe(false);
    expect(
      requiereHttps({
        produccion: true,
        conexionSegura: false,
        ruta: "/saludable",
      }),
    ).toBe(true);
  });

  it("mantiene HTTPS obligatorio para las rutas de negocio", () => {
    expect(
      requiereHttps({
        produccion: true,
        conexionSegura: false,
        ruta: "/api/v1/clientes",
      }),
    ).toBe(true);
    expect(
      requiereHttps({
        produccion: true,
        conexionSegura: true,
        ruta: "/api/v1/clientes",
      }),
    ).toBe(false);
  });
});
