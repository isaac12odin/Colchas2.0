import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const caddyfile = readFileSync(
  new URL("../../deploy/Caddyfile", import.meta.url),
  "utf8",
);
const dockerfileBackend = readFileSync(
  new URL("../Dockerfile", import.meta.url),
  "utf8",
);

describe("enrutamiento del proxy externo", () => {
  it("envía exclusivamente /salud y sus subrutas a la API", () => {
    expect(caddyfile).toContain("@salud path /salud /salud/*");
    expect(caddyfile).toMatch(/handle @salud\s*{\s*reverse_proxy api:4000\s*}/);
  });

  it("declara la ruta de salud antes del fallback de Next", () => {
    const salud = caddyfile.indexOf("handle @salud");
    const front = caddyfile.indexOf("reverse_proxy front:3000");
    expect(salud).toBeGreaterThan(-1);
    expect(front).toBeGreaterThan(salud);
  });
});

describe("imagen de producción del backend", () => {
  it("instala únicamente las dependencias de producción del workspace backend", () => {
    expect(dockerfileBackend).toContain(
      "npm ci --omit=dev --workspace @nexo/back --include-workspace-root=false",
    );
  });

  it("no copia el node_modules general de la compilación a la imagen final", () => {
    expect(dockerfileBackend).not.toMatch(
      /--from=compilacion\s+\/app\/node_modules\s+node_modules/,
    );
    expect(dockerfileBackend).toContain(
      "--from=dependencias-produccion /app/node_modules node_modules",
    );
  });

  it("ejecuta el servidor como usuario sin privilegios", () => {
    expect(dockerfileBackend).toMatch(/USER node\s+EXPOSE 4000/);
  });
});
