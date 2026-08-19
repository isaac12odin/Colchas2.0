import { describe, expect, it } from "vitest";

import { leerConfiguracionSeed } from "../prisma/configuracionSeed.js";

describe("credenciales iniciales sin fallback", () => {
  it("se niega a ejecutar sin credenciales explícitas", () => {
    expect(() => leerConfiguracionSeed({})).toThrow(
      /SEED_ADMIN_EMAIL es obligatorio/,
    );
  });

  it("rechaza la contraseña histórica y ejemplos conocidos", () => {
    expect(() =>
      leerConfiguracionSeed({
        SEED_ADMIN_EMAIL: "admin@empresa.test",
        SEED_ADMIN_PASSWORD: "Systemof01-Insegura!",
      }),
    ).toThrow(/credencial conocida/);
  });

  it("acepta una credencial temporal robusta suministrada por despliegue", () => {
    expect(
      leerConfiguracionSeed({
        SEED_ADMIN_EMAIL: "ADMIN@EMPRESA.TEST",
        SEED_ADMIN_PASSWORD: "Temporal-Unica-9!Larga",
      }),
    ).toMatchObject({ correo: "admin@empresa.test" });
  });
});
