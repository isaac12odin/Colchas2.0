import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { leerConfiguracionSeed } from "../prisma/configuracionSeed.js";

const fuenteSeed = readFileSync(
  new URL("../prisma/seed.ts", import.meta.url),
  "utf8",
);

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

  it("acepta una credencial de al menos seis caracteres", () => {
    expect(
      leerConfiguracionSeed({
        SEED_ADMIN_EMAIL: "ADMIN@EMPRESA.TEST",
        SEED_ADMIN_PASSWORD: "admin6",
      }),
    ).toMatchObject({ correo: "admin@empresa.test" });
  });

  it("rechaza menos de seis caracteres", () => {
    expect(() =>
      leerConfiguracionSeed({
        SEED_ADMIN_EMAIL: "admin@empresa.test",
        SEED_ADMIN_PASSWORD: "12345",
      }),
    ).toThrow(/al menos 6/);
  });

  it("crea la ruta inicial para operación administrativa sin cobrador", () => {
    expect(fuenteSeed).toContain("activa: true");
    expect(fuenteSeed).toContain("Ruta administrativa web");
  });
});
