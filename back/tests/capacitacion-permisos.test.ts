import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { RolUsuario } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { rolesPorPermiso } from "../src/seguridad/permisos.js";

const directorioLecciones = new URL(
  "../../front/modulos/capacitacion/lecciones/",
  import.meta.url,
);

function bloqueLeccion(id: string) {
  return readFileSync(
    fileURLToPath(new URL(`${id}.ts`, directorioLecciones)),
    "utf8",
  );
}

function rolesDelBloque(bloque: string) {
  const captura = bloque.match(/roles:\s*\[([^\]]+)]/s)?.[1] ?? "";
  return [...captura.matchAll(/"([A-Z_]+)"/g)].map((coincidencia) =>
    coincidencia[1]!.trim(),
  );
}

describe("capacitación alineada con permisos sensibles", () => {
  it("enseña autorización de devoluciones sólo a los roles permitidos por la API", () => {
    const leccion = bloqueLeccion("devoluciones-seguras");
    expect(rolesDelBloque(leccion).sort()).toEqual(
      [...rolesPorPermiso.DEVOLUCIONES_AUTORIZAR].map(String).sort(),
    );
    expect(leccion).toContain('tipoSimulador: "DEVOLUCION"');
    expect(leccion).toContain('rutaReal: "/devoluciones"');
  });

  it("da a Almacén una revisión física sin acciones de autorización o caja", () => {
    const leccion = bloqueLeccion("devolucion-revisar-almacen");
    expect(rolesDelBloque(leccion)).toEqual([RolUsuario.ALMACENISTA]);
    expect(rolesPorPermiso.DEVOLUCIONES_CONSULTAR).toContain(
      RolUsuario.ALMACENISTA,
    );
    expect(rolesPorPermiso.DEVOLUCIONES_AUTORIZAR.map(String)).not.toContain(
      RolUsuario.ALMACENISTA,
    );
    expect(leccion).toContain('rutaReal: "/devoluciones"');
    expect(leccion).not.toMatch(
      /"Autorizar"|"Confirmar reembolso"|"Seleccionar operador de caja"/i,
    );
  });
});
