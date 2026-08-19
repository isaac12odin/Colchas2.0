import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const helper = readFileSync(
  new URL("../../scripts/postgres-herramientas.sh", import.meta.url),
  "utf8",
);
const respaldo = readFileSync(
  new URL("../../scripts/respaldo-postgres.sh", import.meta.url),
  "utf8",
);
const restauracion = readFileSync(
  new URL("../../scripts/probar-restauracion.sh", import.meta.url),
  "utf8",
);

describe("herramientas PostgreSQL coherentes", () => {
  it("detecta la versión mayor del servidor y resuelve binarios compatibles", () => {
    expect(helper).toContain("SHOW server_version_num");
    expect(helper).toContain("normalizar_url_postgres_cli");
    expect(helper).toContain("resolver_binarios_postgres");
    expect(respaldo).toContain(
      'resolver_binarios_postgres "$major_servidor" pg_dump psql',
    );
    expect(respaldo).toContain('"$POSTGRES_BIN/pg_dump"');
  });

  it("guarda versión y huella junto a cada respaldo", () => {
    expect(respaldo).toContain('"$archivo.pg-major"');
    expect(respaldo).toContain('"$archivo.sha256"');
  });

  it("rechaza restaurar entre versiones mayores distintas", () => {
    expect(restauracion).toContain(
      'if [ "$major_respaldo" != "$major_destino" ]',
    );
    expect(restauracion).toContain('"$POSTGRES_BIN/pg_restore"');
    expect(restauracion).toContain('"$POSTGRES_BIN/psql"');
  });

  it("valida el nombre conectado y no una coincidencia dentro de la URL", () => {
    expect(restauracion).not.toContain("grep -q '_restore_test'");
    expect(restauracion).toContain("SELECT current_database();");
    expect(restauracion).toContain("*_restore_test) ;;");
    expect(restauracion.indexOf("SELECT current_database();")).toBeLessThan(
      restauracion.indexOf('"$POSTGRES_BIN/pg_restore" --clean'),
    );
  });
});
