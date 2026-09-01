import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { sanearDatosAuditoria } from "../src/compartido/auditoria.js";

describe("saneamiento central de auditoría", () => {
  it("elimina secretos y reduce datos personales sin perder el cambio", () => {
    expect(
      sanearDatosAuditoria({
        id: "cliente-1",
        nombreCompleto: "María Ejemplo",
        telefono: "+52 222 123 4567",
        direccion: "Calle Privada 1",
        correo: "maria@example.test",
        hashContrasena: "argon2-secreto",
        foto: { base64: "dato-binario" },
        saldo: 350,
      }),
    ).toEqual({
      id: "cliente-1",
      nombreCompleto: "María Ejemplo",
      telefono: "***4567",
      direccion: "[DATO PERSONAL]",
      correo: "[DATO PERSONAL]",
      hashContrasena: "[PROTEGIDO]",
      foto: { base64: "[PROTEGIDO]" },
      saldo: 350,
    });
  });

  it("omite cadenas enormes que podrían duplicar archivos", () => {
    expect(sanearDatosAuditoria({ contenido: "x".repeat(1_200) })).toEqual({
      contenido: "[CONTENIDO OMITIDO: 1200 caracteres]",
    });
  });

  it("serializa Decimal, bigint y fechas sin perder precisión", () => {
    expect(
      sanearDatosAuditoria({
        importe: new Prisma.Decimal("9999999999.99"),
        contador: 9_007_199_254_740_993n,
        fecha: new Date("2026-09-01T12:34:56.000Z"),
      }),
    ).toEqual({
      importe: "9999999999.99",
      contador: "9007199254740993",
      fecha: "2026-09-01T12:34:56.000Z",
    });
  });

  it("protege Buffer y vistas tipadas sin copiar sus bytes", () => {
    expect(
      sanearDatosAuditoria({
        archivo: Buffer.from("contenido privado"),
        firma: new Uint8Array([1, 2, 3, 4]),
        segmento: new DataView(new ArrayBuffer(6)),
      }),
    ).toEqual({
      archivo: "[BINARIO OMITIDO: 17 bytes]",
      firma: "[BINARIO OMITIDO: 4 bytes]",
      segmento: "[BINARIO OMITIDO: 6 bytes]",
    });
  });

  it("tolera ciclos y conserva campos útiles de objetos no planos", () => {
    class Movimiento {
      folio = "MOV-100";
      total = new Prisma.Decimal("125.50");
    }
    const datos: { movimiento: Movimiento; mismo?: unknown } = {
      movimiento: new Movimiento(),
    };
    datos.mismo = datos;

    expect(sanearDatosAuditoria(datos)).toEqual({
      movimiento: {
        $tipo: "Movimiento",
        folio: "MOV-100",
        total: "125.5",
      },
      mismo: "[REFERENCIA CIRCULAR]",
    });
  });

  it("sanea mapas, conjuntos y valores no representables", () => {
    expect(
      sanearDatosAuditoria({
        etiquetas: new Set(["venta", "contado"]),
        totales: new Map<string, unknown>([
          ["efectivo", new Prisma.Decimal("80.00")],
          ["transferencia", 20n],
        ]),
        infinito: Number.POSITIVE_INFINITY,
      }),
    ).toEqual({
      etiquetas: ["venta", "contado"],
      totales: { efectivo: "80", transferencia: "20" },
      infinito: "[NÚMERO NO FINITO: Infinity]",
    });
  });
});
