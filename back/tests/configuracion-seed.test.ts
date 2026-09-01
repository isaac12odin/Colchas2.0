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

  it("acepta una credencial de al menos doce caracteres", () => {
    expect(
      leerConfiguracionSeed({
        SEED_ADMIN_EMAIL: "ADMIN@EMPRESA.TEST",
        SEED_ADMIN_PASSWORD: "Admin-Nueva-2026!",
      }),
    ).toMatchObject({ correo: "admin@empresa.test" });
  });

  it("rechaza menos de doce caracteres", () => {
    expect(() =>
      leerConfiguracionSeed({
        SEED_ADMIN_EMAIL: "admin@empresa.test",
        SEED_ADMIN_PASSWORD: "Corta2026!",
      }),
    ).toThrow(/al menos 12/);
  });

  it("crea la ruta inicial para operación administrativa sin cobrador", () => {
    expect(fuenteSeed).toContain("activa: true");
    expect(fuenteSeed).toContain("Ruta administrativa web");
  });

  it("crea la cuenta inicial como temporal y no pisa la clave al repetir el seed", () => {
    expect(fuenteSeed).toContain("debeCambiarContrasena: true");
    const bloqueActualizacion = fuenteSeed.match(
      /update:\s*\{([\s\S]*?)\},\s*create:/,
    )?.[1];
    expect(bloqueActualizacion).toBeDefined();
    expect(bloqueActualizacion).not.toContain("hashContrasena");
    expect(bloqueActualizacion).not.toContain("debeCambiarContrasena");
    expect(fuenteSeed).toContain(
      "administrador.rol !== RolUsuario.ADMINISTRADOR",
    );
    expect(fuenteSeed).toContain("!administrador.activo");
  });
});
