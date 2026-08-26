import type { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { resolverAcuerdoParaVenta } from "../src/modulos/cobranza/acuerdoPago.js";

describe("acuerdo de pago del cliente", () => {
  it("una venta nueva aumenta el plazo sin aumentar el abono acordado", async () => {
    const acuerdo = {
      id: "acuerdo-1",
      clienteId: "cliente-1",
      periodicidad: "SEMANAL" as const,
      montoPeriodico: 100,
      activo: true,
      creadoEn: new Date(),
      actualizadoEn: new Date(),
    };
    const tx = {
      cliente: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          saldo: { saldoActual: 1_000 },
          acuerdoPago: acuerdo,
        }),
      },
      cuota: {
        findFirst: vi.fn().mockResolvedValue({
          fechaVence: new Date("2026-09-01T12:00:00-06:00"),
        }),
      },
      acuerdoPagoCliente: { upsert: vi.fn() },
    } as unknown as Prisma.TransactionClient;

    const resultado = await resolverAcuerdoParaVenta(
      tx,
      "cliente-1",
      new Date("2026-08-25T12:00:00-06:00"),
      {
        periodicidad: "MENSUAL",
        montoCuota: 150,
        primerVencimiento: new Date("2026-09-25T12:00:00-06:00"),
      },
    );

    expect(resultado.respetado).toBe(true);
    expect(resultado.plan.periodicidad).toBe("SEMANAL");
    expect(resultado.plan.montoCuota).toBe(100);
    expect(resultado.plan.primerVencimiento).toEqual(
      new Date("2026-09-08T12:00:00-06:00"),
    );
    expect(tx.acuerdoPagoCliente.upsert).not.toHaveBeenCalled();
  });

  it("permite definir un acuerdo nuevo cuando el cliente no debe", async () => {
    const acuerdo = {
      id: "acuerdo-nuevo",
      periodicidad: "QUINCENAL",
      montoPeriodico: 150,
    };
    const upsert = vi.fn().mockResolvedValue(acuerdo);
    const tx = {
      cliente: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          saldo: { saldoActual: 0 },
          acuerdoPago: null,
        }),
      },
      cuota: { findFirst: vi.fn().mockResolvedValue(null) },
      acuerdoPagoCliente: { upsert },
    } as unknown as Prisma.TransactionClient;
    const solicitado = {
      periodicidad: "QUINCENAL" as const,
      montoCuota: 150,
      primerVencimiento: new Date("2026-09-09T12:00:00-06:00"),
    };

    const resultado = await resolverAcuerdoParaVenta(
      tx,
      "cliente-2",
      new Date("2026-08-25T12:00:00-06:00"),
      solicitado,
    );

    expect(resultado).toMatchObject({ plan: solicitado, respetado: false });
    expect(upsert).toHaveBeenCalledOnce();
  });
});
