import { RolUsuario } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { calcularHuellaAbono } from "../src/modulos/cobranza/servicio.js";
import { calcularHuellaVenta } from "../src/modulos/ventas/servicio.js";

const actor = {
  id: "11111111-1111-4111-8111-111111111111",
  rol: RolUsuario.ADMINISTRADOR,
};
const fecha = new Date("2026-08-20T12:00:00.000Z");
const productoId = "22222222-2222-4222-8222-222222222222";
const clienteId = "33333333-3333-4333-8333-333333333333";

describe("huella canónica completa", () => {
  it("cambia ante cualquier campo monetario relevante de una venta", () => {
    const base = {
      idOperacionMovil: "venta-idempotente-1",
      clienteId,
      numeroTarjeta: "T-001",
      tipo: "CREDITO" as const,
      descuento: 0,
      anticipo: 10,
      metodoAnticipo: "EFECTIVO" as const,
      fechaVenta: fecha,
      notas: "captura original",
      items: [{ productoId, cantidad: 1, precioUnitario: 100 }],
      plan: {
        periodicidad: "SEMANAL" as const,
        montoCuota: 10,
        primerVencimiento: new Date("2026-08-27T12:00:00.000Z"),
      },
    };
    const original = calcularHuellaVenta(actor, base);
    const cambios = [
      { ...base, metodoAnticipo: "TRANSFERENCIA" as const },
      { ...base, fechaVenta: new Date("2026-08-20T12:01:00.000Z") },
      { ...base, anticipo: 11 },
      { ...base, numeroTarjeta: "T-002" },
      { ...base, items: [{ productoId, cantidad: 1, precioUnitario: 99 }] },
      {
        ...base,
        plan: {
          ...base.plan,
          primerVencimiento: new Date("2026-08-28T12:00:00.000Z"),
        },
      },
    ];
    for (const cambio of cambios)
      expect(calcularHuellaVenta(actor, cambio)).not.toBe(original);
  });

  it("incluye método, referencias, fecha y monto del abono", () => {
    const base = {
      clienteId,
      ventaId: "44444444-4444-4444-8444-444444444444",
      visitaId: "55555555-5555-4555-8555-555555555555",
      idOperacionMovil: "abono-idempotente-1",
      monto: 50,
      metodo: "EFECTIVO" as const,
      fechaAbono: fecha,
      referencia: "TRANS-1",
      notas: "original",
    };
    const original = calcularHuellaAbono(actor, base);
    for (const cambio of [
      { ...base, monto: 51 },
      { ...base, metodo: "TARJETA" as const },
      { ...base, fechaAbono: new Date("2026-08-20T12:01:00.000Z") },
      { ...base, referencia: "TRANS-2" },
      { ...base, visitaId: null },
    ])
      expect(calcularHuellaAbono(actor, cambio)).not.toBe(original);
  });
});
