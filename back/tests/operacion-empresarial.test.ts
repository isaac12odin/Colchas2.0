import { describe, expect, it } from "vitest";

import {
  codigoParaContador,
  generarSecretoMfa,
  validarCodigoMfa,
} from "../src/seguridad/mfa.js";
import {
  calcularAplicacionDevolucion,
  esquemaDevolucion,
} from "../src/modulos/devoluciones/servicio.js";
import { esquemaEntregaPedido } from "../src/modulos/pedidos/servicio.js";
import { rolTienePermiso } from "../src/seguridad/permisos.js";
import { RolUsuario } from "@prisma/client";

describe("controles de operacion empresarial", () => {
  it("separa la devolucion entre disminucion de saldo y reembolso", () => {
    expect(calcularAplicacionDevolucion(1_000, 700, 600)).toEqual({
      aplicadoSaldo: 600,
      reembolso: 400,
    });
    expect(calcularAplicacionDevolucion(250, 900, 500)).toEqual({
      aplicadoSaldo: 250,
      reembolso: 0,
    });
  });

  it("valida TOTP dentro de la ventana y rechaza codigos distintos", () => {
    const secreto = generarSecretoMfa();
    const ahora = 1_787_155_200_000;
    const contador = BigInt(Math.floor(ahora / 30_000));
    const codigo = codigoParaContador(secreto, contador);
    expect(validarCodigoMfa(secreto, codigo, ahora)).toBe(contador);
    const incorrecto = codigo === "000000" ? "000001" : "000000";
    expect(validarCodigoMfa(secreto, incorrecto, ahora)).toBeNull();
  });

  it("acepta proveedor por articulo en una entrega offline", () => {
    const datos = esquemaEntregaPedido.parse({
      pedidoId: "11111111-1111-4111-8111-111111111111",
      tipo: "CONTADO",
      proveedores: [
        {
          itemPedidoId: "22222222-2222-4222-8222-222222222222",
          proveedorId: "33333333-3333-4333-8333-333333333333",
        },
      ],
    });
    expect(datos.proveedores).toHaveLength(1);
  });

  it("exige un producto de reemplazo cuando la devolucion es un cambio", () => {
    const base = {
      ventaId: "11111111-1111-4111-8111-111111111111",
      tipo: "CAMBIO" as const,
      motivo: "Cambio por talla solicitada por la clienta",
      montoReembolsado: 0,
      evidencia: {
        nombre: "cambio.png",
        mime: "image/png" as const,
        base64: Buffer.from("evidencia-fotografica").toString("base64"),
      },
      items: [
        {
          detalleVentaId: "22222222-2222-4222-8222-222222222222",
          cantidad: 1,
        },
      ],
    };
    expect(esquemaDevolucion.safeParse(base).success).toBe(false);
    expect(
      esquemaDevolucion.safeParse({
        ...base,
        reemplazos: [
          {
            productoId: "33333333-3333-4333-8333-333333333333",
            cantidad: 1,
          },
        ],
      }).success,
    ).toBe(true);
  });

  it("exige identificar la caja cuando existe un reembolso", () => {
    const datos = {
      ventaId: "11111111-1111-4111-8111-111111111111",
      tipo: "TOTAL" as const,
      motivo: "Devolución completa con salida de efectivo",
      montoReembolsado: 100,
      metodoReembolso: "EFECTIVO" as const,
      evidencia: {
        nombre: "devolucion.png",
        mime: "image/png" as const,
        base64: Buffer.from("evidencia-fotografica").toString("base64"),
      },
      items: [
        {
          detalleVentaId: "22222222-2222-4222-8222-222222222222",
          cantidad: 1,
        },
      ],
    };
    expect(esquemaDevolucion.safeParse(datos).success).toBe(false);
    expect(
      esquemaDevolucion.safeParse({
        ...datos,
        usuarioOperadorId: "33333333-3333-4333-8333-333333333333",
      }).success,
    ).toBe(true);
  });

  it("reserva devoluciones e importaciones a los roles autorizados", () => {
    expect(rolTienePermiso(RolUsuario.CONTABLE, "DEVOLUCIONES_AUTORIZAR")).toBe(
      true,
    );
    expect(
      rolTienePermiso(RolUsuario.ALMACENISTA, "DEVOLUCIONES_AUTORIZAR"),
    ).toBe(false);
    expect(
      rolTienePermiso(RolUsuario.ADMINISTRADOR, "IMPORTACIONES_EJECUTAR"),
    ).toBe(true);
  });
});
