import { RolUsuario } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { esRolOperadorCaja } from "../src/modulos/cortes/servicio.js";

describe("operadores reales de caja", () => {
  it.each([
    RolUsuario.ADMINISTRADOR,
    RolUsuario.CONTABLE,
    RolUsuario.VENDEDOR,
    RolUsuario.COBRADOR,
  ])("incluye a %s porque puede originar movimientos monetarios", (rol) => {
    expect(esRolOperadorCaja(rol)).toBe(true);
  });

  it("excluye a Almacén sin concederle capacidades financieras", () => {
    expect(esRolOperadorCaja(RolUsuario.ALMACENISTA)).toBe(false);
  });
});
