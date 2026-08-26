import { describe, expect, it } from "vitest";

import {
  puedeAccederModuloMovil,
  puedeAccederRutaMovil,
} from "../src/permisos";

describe("autorización de la aplicación móvil", () => {
  it("permite al almacenista crear productos, pero no cobrar ni ver resumen", () => {
    expect(puedeAccederModuloMovil("ALMACENISTA", "inventario")).toBe(true);
    expect(puedeAccederModuloMovil("ALMACENISTA", "cobranza")).toBe(false);
    expect(puedeAccederModuloMovil("ALMACENISTA", "resumen")).toBe(false);
  });

  it("permite al cobrador rutas, ventas y sincronización, no inventario", () => {
    expect(puedeAccederModuloMovil("COBRADOR", "cobranza")).toBe(true);
    expect(puedeAccederModuloMovil("COBRADOR", "ventaCampo")).toBe(true);
    expect(puedeAccederModuloMovil("COBRADOR", "sincronizacion")).toBe(true);
    expect(puedeAccederModuloMovil("COBRADOR", "inventario")).toBe(false);
  });

  it("habilita al administrador en toda la operación móvil", () => {
    for (const modulo of [
      "inicio",
      "cobranza",
      "ventaCampo",
      "inventario",
      "pedidos",
      "sincronizacion",
      "resumen",
      "cambioContrasena",
    ] as const) {
      expect(puedeAccederModuloMovil("ADMINISTRADOR", modulo)).toBe(true);
    }
  });

  it("mantiene cerrada cualquier ruta móvil que no tenga permiso explícito", () => {
    expect(puedeAccederRutaMovil("COBRADOR", ["(app)", "inventario"])).toBe(
      false,
    );
    expect(puedeAccederRutaMovil("ALMACENISTA", ["(app)", "ruta", "1"])).toBe(
      false,
    );
    expect(
      puedeAccederRutaMovil("ADMINISTRADOR", ["(app)", "desconocida"]),
    ).toBe(false);
  });
});
