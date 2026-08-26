import { describe, expect, it } from "vitest";

import {
  combinarClientesRuta,
  esVisitaFueraDeRuta,
} from "../src/modulos/rutas/reglas.js";
import { esquemaRuta } from "../src/modulos/rutas/rutas.js";

describe("rutas flexibles", () => {
  it("acepta una ruta de una o varias localidades", () => {
    const base = {
      nombre: "Ruta norte",
      diaSemana: "LUNES",
      cobradorId: "33333333-3333-4333-8333-333333333333",
      localidadIds: ["11111111-1111-4111-8111-111111111111"],
    };
    expect(esquemaRuta.parse(base).localidadIds).toHaveLength(1);
    expect(esquemaRuta.parse(base).incluirClientesLocalidades).toBe(false);
    expect(
      esquemaRuta.parse({
        ...base,
        localidadIds: [
          ...base.localidadIds,
          "22222222-2222-4222-8222-222222222222",
        ],
      }).localidadIds,
    ).toHaveLength(2);
  });

  it("permite operar desde web sin asignar un cobrador móvil", () => {
    const rutaAdministrativa = esquemaRuta.parse({
      nombre: "Ruta web centro",
      diaSemana: "MARTES",
      cobradorId: null,
      localidadIds: ["11111111-1111-4111-8111-111111111111"],
      clienteIds: ["22222222-2222-4222-8222-222222222222"],
    });

    expect(rutaAdministrativa.cobradorId).toBeNull();
  });

  it("combina clientes de localidades sin duplicarlos", () => {
    expect(combinarClientesRuta(["a", "b"], ["b", "c"])).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("marca como extraordinaria sólo la visita sin asignación activa", () => {
    expect(esVisitaFueraDeRuta({ activo: true })).toBe(false);
    expect(esVisitaFueraDeRuta({ activo: false })).toBe(true);
    expect(esVisitaFueraDeRuta(null)).toBe(true);
  });
});
