import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function leer(ruta: string) {
  return readFileSync(new URL(`../../${ruta}`, import.meta.url), "utf8");
}

describe("documentación operable por otro equipo", () => {
  it("mantiene un contrato OpenAPI amplio con seguridad y flujos críticos", () => {
    const contrato = leer("openapi.yaml");
    expect(contrato).toContain("openapi: 3.1.0");
    expect(
      (contrato.match(/^  \/[^:]+:/gm) ?? []).length,
    ).toBeGreaterThanOrEqual(60);
    for (const ruta of [
      "/auth/renovar:",
      "/clientes/{id}/saldo:",
      "/ventas:",
      "/abonos/{id}/anular:",
      "/devoluciones:",
      "/cortes:",
      "/sincronizacion/lotes:",
      "/sincronizacion/revisiones/{id}/resolver:",
      "/sincronizacion/dispositivos/{id}/reemplazar:",
      "/proveedores/opciones:",
      "/reconciliacion:",
      "/importaciones/excel:",
    ])
      expect(contrato).toContain(ruta);
    expect(contrato).toContain("x-roles:");
    expect(contrato).toContain("multipleOf: 0.01");
    expect(contrato).toContain("maxItems: 500");
    expect(contrato).toContain("maximum: 9999999999.99");
  });

  it("documenta invariantes, release, privacidad y recuperación", () => {
    const invariantes = leer("docs/INVARIANTES_NEGOCIO.md");
    const release = leer("docs/RELEASE.md");
    const privacidad = leer("docs/PRIVACIDAD_DATOS.md");
    const offline = leer("docs/runbooks/OFFLINE.md");
    const modelo = leer("docs/MODELO_DATOS.md");
    const observabilidad = leer("docs/OBSERVABILIDAD.md");
    const movil = leer("docs/MOVIL_RELEASE.md");
    expect(invariantes).toContain("36 horas");
    expect(invariantes).toContain("SAVEPOINT");
    expect(invariantes).toContain("nexo:administradores-activos");
    expect(release).toContain("db:reindexar-telefonos");
    expect(release).toContain("rollback");
    expect(privacidad).toContain("SEARCH_HMAC_KEY");
    expect(offline).toContain("RECHAZADA");
    expect(offline).toContain("No reinstale");
    expect(modelo).toContain("Libros y proyecciones");
    expect(observabilidad).toContain("reconciliación");
    expect(movil).toContain("SQLCipher");
  });
});
