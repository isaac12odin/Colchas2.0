import { describe, expect, it } from "vitest";

import { esquemaConsultaPedidos } from "../src/modulos/pedidos/rutas.js";
import { esquemaConsultaUsuarios } from "../src/modulos/usuarios/rutas.js";

describe("consultas paginadas de pedidos y usuarios", () => {
  it("normaliza paginación y filtros de pedidos", () => {
    expect(
      esquemaConsultaPedidos.parse({
        pagina: "3",
        limite: "12",
        buscar: "  María  ",
        estado: "PENDIENTE_PEDIR",
        clienteId: "00000000-0000-4000-8000-000000000001",
      }),
    ).toEqual({
      pagina: 3,
      limite: 12,
      buscar: "María",
      estado: "PENDIENTE_PEDIR",
      clienteId: "00000000-0000-4000-8000-000000000001",
    });
  });

  it("normaliza rol y estado activo sin aceptar valores ambiguos", () => {
    expect(
      esquemaConsultaUsuarios.parse({
        pagina: "2",
        limite: "15",
        buscar: "  ana@nexo  ",
        rol: "COBRADOR",
        activo: "false",
      }),
    ).toEqual({
      pagina: 2,
      limite: 15,
      buscar: "ana@nexo",
      rol: "COBRADOR",
      activo: false,
    });
    expect(() => esquemaConsultaUsuarios.parse({ activo: "1" })).toThrow();
    expect(() => esquemaConsultaPedidos.parse({ limite: "101" })).toThrow();
  });
});
