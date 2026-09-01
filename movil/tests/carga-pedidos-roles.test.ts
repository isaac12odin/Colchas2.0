import { describe, expect, it, vi } from "vitest";

import { cargarPedidosPermitidos } from "../src/modulos/pedidos/cargaPedidosPermitida";
import type { PedidoMovil, ProveedorMovil } from "../src/tipos";

const pedido: PedidoMovil = {
  id: "pedido-1",
  folio: "PED-001",
  estado: "LISTO_ENTREGA",
  items: [],
};
const proveedor: ProveedorMovil = { id: "proveedor-1", nombre: "Textiles" };

describe("carga de pedidos según el permiso del rol", () => {
  it.each(["COBRADOR", "VENDEDOR"])(
    "%s consulta pedidos sin solicitar el catálogo prohibido",
    async () => {
      const consultarProveedores = vi.fn(async () => {
        throw new Error("403");
      });
      const resultado = await cargarPedidosPermitidos({
        puedeConsultarProveedores: false,
        consultarPedidos: async () => [pedido],
        consultarProveedores,
      });

      expect(resultado).toEqual({ pedidos: [pedido], proveedores: [] });
      expect(consultarProveedores).not.toHaveBeenCalled();
    },
  );

  it("mantiene pedidos visibles si el catálogo opcional falla", async () => {
    const resultado = await cargarPedidosPermitidos({
      puedeConsultarProveedores: true,
      consultarPedidos: async () => [pedido],
      consultarProveedores: async () => {
        throw new Error("servicio temporalmente no disponible");
      },
    });

    expect(resultado.pedidos).toEqual([pedido]);
    expect(resultado.proveedores).toBeNull();
    expect(resultado).toHaveProperty("errorProveedores");
  });

  it("entrega proveedores a los roles autorizados", async () => {
    const resultado = await cargarPedidosPermitidos({
      puedeConsultarProveedores: true,
      consultarPedidos: async () => [pedido],
      consultarProveedores: async () => [proveedor],
    });

    expect(resultado).toEqual({ pedidos: [pedido], proveedores: [proveedor] });
  });

  it("sí propaga un fallo de la consulta principal de pedidos", async () => {
    await expect(
      cargarPedidosPermitidos({
        puedeConsultarProveedores: true,
        consultarPedidos: async () => {
          throw new Error("sin acceso a pedidos");
        },
        consultarProveedores: async () => [proveedor],
      }),
    ).rejects.toThrow("sin acceso a pedidos");
  });
});
