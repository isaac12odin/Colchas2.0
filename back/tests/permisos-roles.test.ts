import { RolUsuario } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { rolTienePermiso } from "../src/seguridad/permisos.js";

describe("permisos por rol", () => {
  it("permite al administrador operar todos los módulos protegidos", () => {
    expect(rolTienePermiso(RolUsuario.ADMINISTRADOR, "RUTAS_OPERAR")).toBe(
      true,
    );
    expect(
      rolTienePermiso(RolUsuario.ADMINISTRADOR, "INVENTARIO_GESTIONAR"),
    ).toBe(true);
    expect(rolTienePermiso(RolUsuario.ADMINISTRADOR, "PEDIDOS_ENTREGAR")).toBe(
      true,
    );
  });

  it("separa las funciones de almacenista y cobrador", () => {
    expect(
      rolTienePermiso(RolUsuario.ALMACENISTA, "INVENTARIO_GESTIONAR"),
    ).toBe(true);
    expect(rolTienePermiso(RolUsuario.ALMACENISTA, "RUTAS_OPERAR")).toBe(false);
    expect(rolTienePermiso(RolUsuario.COBRADOR, "RUTAS_OPERAR")).toBe(true);
    expect(rolTienePermiso(RolUsuario.COBRADOR, "INVENTARIO_GESTIONAR")).toBe(
      false,
    );
  });

  it("da a contabilidad consulta transversal sin operación de almacén", () => {
    expect(rolTienePermiso(RolUsuario.CONTABLE, "PEDIDOS_CONSULTAR")).toBe(
      true,
    );
    expect(rolTienePermiso(RolUsuario.CONTABLE, "RUTAS_HISTORIAL")).toBe(true);
    expect(rolTienePermiso(RolUsuario.CONTABLE, "INVENTARIO_GESTIONAR")).toBe(
      false,
    );
  });

  it("limita al vendedor a catálogo y captura comercial", () => {
    expect(rolTienePermiso(RolUsuario.VENDEDOR, "INVENTARIO_CATALOGO")).toBe(
      true,
    );
    expect(rolTienePermiso(RolUsuario.VENDEDOR, "PEDIDOS_CREAR")).toBe(true);
    expect(rolTienePermiso(RolUsuario.VENDEDOR, "INVENTARIO_GESTIONAR")).toBe(
      false,
    );
    expect(rolTienePermiso(RolUsuario.VENDEDOR, "RUTAS_OPERAR")).toBe(false);
  });
});
