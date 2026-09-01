import { describe, expect, it } from "vitest";

import { esquemaContrasenaSegura } from "../src/seguridad/contrasenas.js";

describe("contraseñas", () => {
  it.each(["123456789012", "frase larga segura", "CLAVE-LARGA-1"])(
    "acepta %s cuando cumple la longitud mínima",
    (contrasena) => {
      expect(esquemaContrasenaSegura.safeParse(contrasena).success).toBe(true);
    },
  );

  it("rechaza menos de 12 caracteres", () => {
    expect(esquemaContrasenaSegura.safeParse("12345678901").success).toBe(
      false,
    );
  });

  it("rechaza más de 200 caracteres", () => {
    expect(esquemaContrasenaSegura.safeParse("a".repeat(201)).success).toBe(
      false,
    );
  });
});
