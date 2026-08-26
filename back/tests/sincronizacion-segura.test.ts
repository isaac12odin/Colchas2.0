import { describe, expect, it } from "vitest";

import { esquemaLoteSincronizacion } from "../src/modulos/sincronizacion/esquemas.js";
import { reciboCoincide } from "../src/modulos/sincronizacion/integridad.js";

describe("sincronización segura", () => {
  const recibo = {
    usuarioId: "usuario-a",
    dispositivoId: "equipo-a",
    hashContenido: "a".repeat(128),
    secuencia: 1,
    hashAnterior: "GENESIS",
    creadaEnCliente: new Date("2026-08-19T12:00:00.000Z"),
  };
  const operacion = {
    idOperacion: "operacion-segura-001",
    tipo: "VISITA" as const,
    secuencia: 1,
    hashAnterior: "GENESIS" as const,
    creadoEn: new Date("2026-08-19T12:00:00.000Z"),
    hashIntegridad: "a".repeat(128),
    datos: {
      rutaId: "11111111-1111-4111-8111-111111111111",
      clienteId: "22222222-2222-4222-8222-222222222222",
      fechaProgramada: new Date("2026-08-19T12:00:00.000Z"),
      fechaVisita: new Date("2026-08-19T12:00:00.000Z"),
      resultado: "AUSENTE" as const,
    },
  };

  it("acepta un reintento idéntico del mismo usuario y equipo", () => {
    expect(reciboCoincide(recibo, operacion, "usuario-a", "equipo-a")).toBe(
      true,
    );
  });

  it("rechaza apropiación del id y cambio de contenido", () => {
    expect(reciboCoincide(recibo, operacion, "usuario-b", "equipo-a")).toBe(
      false,
    );
    expect(
      reciboCoincide(
        recibo,
        { ...operacion, hashIntegridad: "b".repeat(128) },
        "usuario-a",
        "equipo-a",
      ),
    ).toBe(false);
  });

  it("limita el lote para evitar abuso de memoria y procesamiento", () => {
    expect(() =>
      esquemaLoteSincronizacion.parse({
        idLoteCliente: "lote-seguro-001",
        dispositivoId: "equipo-a",
        huellaIntegridad: "b".repeat(128),
        operaciones: Array.from({ length: 501 }, () => operacion),
      }),
    ).toThrow();
  });
});
