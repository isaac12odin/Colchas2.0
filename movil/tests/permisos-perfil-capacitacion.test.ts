import { describe, expect, it } from "vitest";

import {
  leccionesCapacitacionMovil,
  leccionesMovilesParaRol,
  rutaCapacitacionMovilParaRol,
} from "../src/modulos/capacitacion/catalogo";
import {
  debeForzarCambioContrasena,
  debePrepararIntegridadDispositivo,
  puedeAccederModuloMovil,
  puedeAccederRutaMovil,
} from "../src/permisos";
import type { Rol } from "../src/tipos";

const roles: readonly Rol[] = [
  "ADMINISTRADOR",
  "CONTABLE",
  "VENDEDOR",
  "ALMACENISTA",
  "COBRADOR",
];

describe("permisos móviles de perfil y capacitación", () => {
  it.each(roles)("%s puede abrir su perfil y capacitación", (rol) => {
    expect(puedeAccederModuloMovil(rol, "perfil")).toBe(true);
    expect(puedeAccederModuloMovil(rol, "capacitacion")).toBe(true);
    expect(puedeAccederRutaMovil(rol, ["(app)", "perfil"])).toBe(true);
    expect(puedeAccederRutaMovil(rol, ["(app)", "capacitacion"])).toBe(true);
  });

  it.each(roles)(
    "%s mantiene acceso al cambio de su propia contraseña",
    (rol) => {
      expect(puedeAccederModuloMovil(rol, "cambioContrasena")).toBe(true);
      expect(puedeAccederRutaMovil(rol, ["(app)", "cambiar-contrasena"])).toBe(
        true,
      );
    },
  );

  it("pospone el enrolamiento del equipo hasta confirmar la clave", () => {
    expect(debePrepararIntegridadDispositivo("ADMINISTRADOR", true)).toBe(
      false,
    );
    expect(debePrepararIntegridadDispositivo("COBRADOR", true)).toBe(false);
    expect(debePrepararIntegridadDispositivo("ADMINISTRADOR", false)).toBe(
      true,
    );
    expect(debePrepararIntegridadDispositivo("COBRADOR", false)).toBe(true);
    expect(debePrepararIntegridadDispositivo("VENDEDOR", false)).toBe(false);
  });

  it.each(roles)(
    "%s con clave temporal sólo puede abrir el cambio obligatorio",
    (rol) => {
      void rol;
      expect(debeForzarCambioContrasena(true, ["(app)", "inventario"])).toBe(
        true,
      );
      expect(
        debeForzarCambioContrasena(true, ["(app)", "cambiar-contrasena"]),
      ).toBe(false);
      expect(debeForzarCambioContrasena(false, ["(app)", "rutas"])).toBe(false);
    },
  );

  it("la lección de seguridad usa Perfil y está disponible para todos", () => {
    const seguridad = leccionesCapacitacionMovil.find(
      ({ id }) => id === "movil-seguridad",
    );

    expect(seguridad).toBeDefined();
    expect(seguridad?.pantalla).toBe("perfil");
    expect(new Set(seguridad?.roles)).toEqual(new Set(roles));
  });

  it.each(roles)(
    "la ruta de %s sólo contiene lecciones concedidas a ese rol",
    (rol) => {
      const idsPermitidos = new Set(
        leccionesMovilesParaRol(rol).map(({ id }) => id),
      );
      const idsRuta = rutaCapacitacionMovilParaRol(rol).etapas.flatMap(
        ({ lecciones }) => lecciones,
      );

      expect(idsRuta.length).toBeGreaterThan(0);
      expect(new Set(idsRuta).size).toBe(idsRuta.length);
      for (const id of idsRuta) expect(idsPermitidos.has(id)).toBe(true);
    },
  );

  it.each(roles)(
    "el filtro del catálogo para %s no omite ni añade permisos",
    (rol) => {
      const esperadas = leccionesCapacitacionMovil
        .filter(({ roles: permitidos }) => permitidos.includes(rol))
        .map(({ id }) => id)
        .sort();
      const obtenidas = leccionesMovilesParaRol(rol)
        .map(({ id }) => id)
        .sort();

      expect(obtenidas).toEqual(esperadas);
    },
  );

  it("Almacén sólo revisa una devolución ya autorizada", () => {
    const idsAlmacen = leccionesMovilesParaRol("ALMACENISTA").map(
      ({ id }) => id,
    );

    expect(idsAlmacen).toContain("movil-devolucion-almacen");
    expect(idsAlmacen).not.toContain("movil-devolucion");
  });

  it("sólo Administración y Contabilidad practican la autorización", () => {
    const autorizacion = leccionesCapacitacionMovil.find(
      ({ id }) => id === "movil-devolucion",
    );

    expect(autorizacion?.roles).toEqual(["ADMINISTRADOR", "CONTABLE"]);
    expect(autorizacion?.tipoSimulador).toBe("DEVOLUCION");
    for (const rol of ["VENDEDOR", "ALMACENISTA", "COBRADOR"] as const) {
      expect(leccionesMovilesParaRol(rol)).not.toContainEqual(autorizacion);
    }
  });

  it("las prácticas de cobranza y venta respetan los módulos operativos", () => {
    const sensibles = leccionesCapacitacionMovil.filter(({ tipoSimulador }) =>
      ["ABONO", "VENTA_CREDITO", "ENTREGA_PEDIDO"].includes(
        tipoSimulador ?? "",
      ),
    );

    for (const leccion of sensibles) {
      expect(leccion.roles).toEqual(["ADMINISTRADOR", "COBRADOR"]);
      for (const rol of roles) {
        const accesoOperacion =
          leccion.tipoSimulador === "VENTA_CREDITO"
            ? puedeAccederModuloMovil(rol, "ventaCampo")
            : puedeAccederModuloMovil(rol, "cobranza");
        expect(leccion.roles.includes(rol)).toBe(accesoOperacion);
      }
    }
  });

  it.each(roles)("%s sigue sin poder abrir rutas desconocidas", (rol) => {
    expect(
      puedeAccederRutaMovil(rol, ["(app)", "perfil-administrador-ajeno"]),
    ).toBe(false);
  });
});
