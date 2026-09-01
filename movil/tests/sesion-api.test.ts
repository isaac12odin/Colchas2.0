import { describe, expect, it } from "vitest";

import {
  admiteRenovacionAutomatica,
  esRechazoDefinitivoRefresco,
} from "../src/erroresApi";

describe("contrato de renovación y revocación móvil", () => {
  it("renueva una consulta de sesión para no expulsar al usuario al vencer el access token", () => {
    expect(admiteRenovacionAutomatica("/auth/sesion")).toBe(true);
    expect(admiteRenovacionAutomatica("/rutas")).toBe(true);
  });

  it.each(["/auth/iniciar-sesion", "/auth/renovar", "/auth/cerrar-sesion"])(
    "evita recursión de renovación en %s",
    (ruta) => {
      expect(admiteRenovacionAutomatica(ruta)).toBe(false);
    },
  );

  it("sólo un 401 del refresh revoca la sesión global", () => {
    expect(esRechazoDefinitivoRefresco(401)).toBe(true);
    expect(esRechazoDefinitivoRefresco(400)).toBe(false);
    expect(esRechazoDefinitivoRefresco(403)).toBe(false);
    expect(esRechazoDefinitivoRefresco(429)).toBe(false);
    expect(esRechazoDefinitivoRefresco(500)).toBe(false);
    expect(esRechazoDefinitivoRefresco(503)).toBe(false);
  });
});
