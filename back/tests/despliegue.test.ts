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
const nginx = readFileSync(
  new URL("../../deploy/nginx/nexo.deadcode.cloud.conf", import.meta.url),
  "utf8",
);
const encabezadosNginx = readFileSync(
  new URL("../../deploy/nginx/nexo-seguridad.conf", import.meta.url),
  "utf8",
);
const smokeProduccion = readFileSync(
  new URL("../../scripts/verificar-dominio-produccion.mjs", import.meta.url),
  "utf8",
);
const timerRespaldo = readFileSync(
  new URL("../../deploy/systemd/nexo-respaldo.timer", import.meta.url),
  "utf8",
);
const timerReconciliacion = readFileSync(
  new URL("../../deploy/systemd/nexo-reconciliacion.timer", import.meta.url),
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

  it("prueba automáticamente TLS, encabezados, caché y salud del dominio real", () => {
    for (const evidencia of [
      "strict-transport-security",
      "content-security-policy",
      "x-content-type-options",
      "referrer-policy",
      "cache-control",
      "/salud/listo",
      "/capacitacion",
    ])
      expect(smokeProduccion).toContain(evidencia);
  });

  it("versiona ejecución diaria persistente de respaldo y reconciliación", () => {
    expect(timerRespaldo).toContain("OnCalendar=*-*-* 02:15:00");
    expect(timerRespaldo).toContain("Persistent=true");
    expect(timerReconciliacion).toContain("OnCalendar=*-*-* 03:20:00");
    expect(timerReconciliacion).toContain("Persistent=true");
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

  it("inicia el artefacto en la ruta realmente generada por TypeScript", () => {
    expect(dockerfileBackend).toContain(
      'CMD ["node", "back/dist/src/servidor.js"]',
    );
  });
});

describe("proxy Nginx de producción real", () => {
  it("enruta API, salud y web a sus puertos locales sin publicarlos", () => {
    expect(nginx).toContain("rewrite ^/api/(.*)$ /api/v1/$1 break;");
    expect(nginx).toContain("proxy_pass http://127.0.0.1:4100;");
    expect(nginx).toContain("proxy_pass http://127.0.0.1:3100;");
    expect(nginx).toContain("location = /salud/listo");
  });

  it("evita caché de HTML y conserva caché inmutable sólo en assets", () => {
    expect(nginx).toContain('Cache-Control "no-store, max-age=0" always');
    expect(nginx).toContain(
      'Cache-Control "public, max-age=31536000, immutable" always',
    );
  });

  it("declara las políticas defensivas del navegador", () => {
    for (const encabezado of [
      "Strict-Transport-Security",
      "Content-Security-Policy",
      "X-Frame-Options",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "Permissions-Policy",
    ])
      expect(encabezadosNginx).toContain(encabezado);
    expect(encabezadosNginx).toContain("frame-ancestors 'none'");
  });
});
