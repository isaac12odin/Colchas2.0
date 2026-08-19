import { describe, expect, it } from "vitest";

import { ocultarCostosDeVenta } from "../src/modulos/ventas/presentacion.js";

describe("presentación segura del historial", () => {
  it("oculta ambos costos al rol de cobranza y conserva la fotografía comercial", () => {
    const venta = ocultarCostosDeVenta({
      id: "venta-1",
      detalles: [
        {
          productoNombre: "Colcha matrimonial",
          productoSku: "COL-01",
          precioUnitario: 850,
          costoUnitario: 420,
          producto: {
            id: "producto-1",
            nombre: "Nombre actual",
            precioVenta: 900,
            precioCompra: 450,
          },
        },
      ],
    });

    expect(venta.detalles).toHaveLength(1);
    const detalle = venta.detalles[0]!;
    expect(detalle).toMatchObject({
      productoNombre: "Colcha matrimonial",
      productoSku: "COL-01",
      precioUnitario: 850,
      producto: { id: "producto-1", precioVenta: 900 },
    });
    expect(detalle).not.toHaveProperty("costoUnitario");
    expect(detalle.producto).not.toHaveProperty("precioCompra");
  });
});
