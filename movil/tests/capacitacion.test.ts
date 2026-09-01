import { describe, expect, it } from "vitest";

import {
  leccionesCapacitacionMovil,
  leccionesMovilesParaRol,
  nivelCapacitacionMovil,
  puntosCapacitacionMovil,
  rutaCapacitacionMovilParaRol,
} from "../src/modulos/capacitacion/catalogo";
import {
  distribucionCapacitacionMovil,
  porcentajeEtapaCapacitacion,
  siguienteLeccionPendiente,
} from "../src/modulos/capacitacion/presentacion";
import type { Rol } from "../src/tipos";

describe("capacitación móvil segura por rol", () => {
  const roles: Rol[] = [
    "ADMINISTRADOR",
    "CONTABLE",
    "VENDEDOR",
    "ALMACENISTA",
    "COBRADOR",
  ];

  it.each(roles)("ofrece una ruta práctica a %s", (rol) => {
    const lecciones = leccionesMovilesParaRol(rol);
    expect(lecciones.length).toBeGreaterThanOrEqual(3);
    expect(lecciones.every((leccion) => leccion.pasos.length >= 3)).toBe(true);
  });

  it("reserva la asignación de proveedor y separa la entrega", () => {
    const proveedor = leccionesCapacitacionMovil.find(
      ({ id }) => id === "movil-pedido-proveedor",
    );
    const entrega = leccionesCapacitacionMovil.find(
      ({ id }) => id === "movil-pedido-entrega",
    );
    expect(proveedor?.roles).toEqual([
      "ADMINISTRADOR",
      "CONTABLE",
      "ALMACENISTA",
    ]);
    expect(proveedor?.roles).not.toContain("COBRADOR");
    expect(entrega?.roles).toContain("COBRADOR");
    expect(
      entrega?.pasos.map((paso) => paso.explicacion.es).join(" "),
    ).toContain("no la modifica");
  });

  it("separa autorización de devoluciones de la revisión física de Almacén", () => {
    const autorizacion = leccionesCapacitacionMovil.find(
      ({ id }) => id === "movil-devolucion",
    );
    const revision = leccionesCapacitacionMovil.find(
      ({ id }) => id === "movil-devolucion-almacen",
    );
    expect(autorizacion?.roles).toEqual(["ADMINISTRADOR", "CONTABLE"]);
    expect(autorizacion?.tipoSimulador).toBe("DEVOLUCION");
    expect(revision?.roles).toEqual(["ALMACENISTA"]);
    expect(revision?.pantalla).toBe("inventario");
    expect(JSON.stringify(revision)).not.toMatch(
      /Confirmar reembolso|seleccionar operador de caja/i,
    );
  });

  it("calcula XP sin duplicar lecciones", () => {
    expect(puntosCapacitacionMovil(["a", "a", "b"])).toBe(200);
    expect(nivelCapacitacionMovil(["a", "b", "c", "d", "e"])).toBe(2);
  });

  it("ordena la jornada del cobrador desde preparación hasta sincronización", () => {
    const ruta = rutaCapacitacionMovilParaRol("COBRADOR");
    expect(ruta.antesDeSalir.length).toBeGreaterThanOrEqual(3);
    expect(ruta.etapas.map(({ id }) => id)).toEqual([
      "preparar",
      "visitar",
      "cerrar",
    ]);
    expect(ruta.etapas[0]?.lecciones).toContain("movil-ruta");
    expect(ruta.etapas.at(-1)?.lecciones).toEqual(["movil-sincronizacion"]);
  });

  it("explica requisitos y resultados para cada etapa de cada rol", () => {
    for (const rol of roles) {
      const ruta = rutaCapacitacionMovilParaRol(rol);
      const idsOrdenados = new Set(
        ruta.etapas.flatMap((etapa) => etapa.lecciones),
      );
      expect(ruta.antesDeSalir.length).toBeGreaterThanOrEqual(2);
      expect(
        leccionesMovilesParaRol(rol)
          .map(({ id }) => id)
          .filter((id) => !idsOrdenados.has(id)),
      ).toEqual([]);
      expect(
        ruta.etapas.every(
          (etapa) =>
            etapa.necesitas.es.length > 10 &&
            etapa.resultado.es.length > 10 &&
            etapa.lecciones.length > 0,
        ),
      ).toBe(true);
    }
  });

  it("mantiene el catálogo declarativo sin llamadas de red", () => {
    const serializado = JSON.stringify(leccionesCapacitacionMovil);
    expect(serializado).not.toContain("/api/");
    expect(serializado).not.toContain("fetch(");
    expect(serializado).not.toContain("DATABASE_URL");
  });

  it("no inventa una pantalla móvil para recorridos guiados", () => {
    const pantallasReales = new Set([
      "inicio",
      "perfil",
      "inventario",
      "pedidos",
      "rutas",
      "jornada",
      "venta",
      "sincronizacion",
    ]);
    const guiadas = leccionesCapacitacionMovil.filter(
      (leccion) => !leccion.tipoSimulador,
    );
    expect(
      guiadas.filter((leccion) => !pantallasReales.has(leccion.pantalla)),
    ).toEqual([]);
  });

  it("adapta la capacitación a Android compacto, normal y tablet", () => {
    expect(distribucionCapacitacionMovil(280).anchoMaximo).toBe(280);
    expect(distribucionCapacitacionMovil(320)).toMatchObject({
      compacta: true,
      tablet: false,
      margenHorizontal: 10,
      columnasResumen: 1,
      altoMinimoControl: 50,
    });
    expect(distribucionCapacitacionMovil(412)).toMatchObject({
      compacta: false,
      tablet: false,
      margenHorizontal: 16,
      columnasResumen: 2,
      altoMinimoControl: 52,
    });
    expect(distribucionCapacitacionMovil(800)).toMatchObject({
      tablet: true,
      margenHorizontal: 24,
      anchoMaximo: 760,
      columnasResumen: 3,
    });
  });

  it("retoma la siguiente práctica y calcula avance sin duplicados", () => {
    const orden = ["seguridad", "ruta", "abono"];
    expect(siguienteLeccionPendiente(["seguridad"], orden)).toBe("ruta");
    expect(siguienteLeccionPendiente(orden, orden)).toBeNull();
    expect(porcentajeEtapaCapacitacion(["ruta", "ruta"], orden)).toBe(33);
    expect(porcentajeEtapaCapacitacion([], [])).toBe(0);
  });
});
