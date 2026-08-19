import { describe, expect, it } from "vitest";

import { esquemaPedido } from "../src/modulos/pedidos/rutas.js";

describe("pedidos ligados al catálogo", () => {
  const clienteId = "11111111-1111-4111-8111-111111111111";
  const productoId = "22222222-2222-4222-8222-222222222222";

  it("acepta producto registrado y cantidad", () => {
    expect(
      esquemaPedido.parse({
        clienteId,
        items: [{ productoId, cantidad: 2 }],
      }).items[0],
    ).toEqual({ productoId, cantidad: 2 });
  });

  it("rechaza descripciones libres sin producto", () => {
    expect(() =>
      esquemaPedido.parse({
        clienteId,
        items: [{ descripcion: "Algo no registrado", cantidad: 1 }],
      }),
    ).toThrow();
  });
});
