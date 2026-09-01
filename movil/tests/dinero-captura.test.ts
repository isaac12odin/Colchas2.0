import { describe, expect, it } from "vitest";

import { validarEntrega } from "../src/modulos/pedidos/dominioPedidos";
import {
  calcularImportes,
  validarVenta,
} from "../src/modulos/ventas/dominioVenta";
import { parsearDineroCapturado } from "../src/utilidades/dinero";

describe("captura monetaria segura", () => {
  it.each([
    ["100,50", 100.5],
    ["100.50", 100.5],
    [",5", 0.5],
    ["0", 0],
    [" 25,20 ", 25.2],
  ])("interpreta %s como %s", (texto, esperado) => {
    expect(parsearDineroCapturado(texto)).toBe(esperado);
  });

  it.each(["", "NaN", "Infinity", "100,2,3", "--5", "10.999", "1 000"])(
    "rechaza %s sin transformarlo silenciosamente en cero",
    (texto) => {
      expect(parsearDineroCapturado(texto)).toBeNull();
    },
  );

  it("conserva la coma decimal al calcular el anticipo", () => {
    const importes = calcularImportes(
      [
        {
          id: "producto-1",
          sku: "SKU-1",
          nombre: "Producto",
          marca: "Marca",
          existencia: 2,
          precioVenta: "500",
          actualizadoEn: "2030-01-01T00:00:00.000Z",
          cantidad: 1,
        },
      ],
      "CREDITO",
      "100,50",
    );

    expect(importes).toMatchObject({
      anticipoNumero: 100.5,
      anticipoValido: true,
      financiado: 399.5,
    });
  });

  it("impide revisar venta o entrega con importe no finito", () => {
    expect(
      validarVenta({
        carrito: [],
        tipo: "CREDITO",
        total: 500,
        anticipo: 0,
        anticipoValido: false,
        numeroTarjeta: "T-001",
        cuota: "100",
        primerVencimiento: "2030-05-10",
      }),
    ).toBe("PRODUCTO");
    expect(
      validarEntrega(500, "CREDITO", null, "100", "2030-05-10", "T-001"),
    ).toBe("ANTICIPO");
  });
});
