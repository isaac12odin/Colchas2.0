import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";

import { transmitirDocumentoRutaPdf } from "../src/modulos/rutas/documentos/dibujarDocumentoRuta.js";
import type { DatosDocumentoRuta } from "../src/modulos/rutas/documentos/tipos.js";

const datos: DatosDocumentoRuta = {
  rutaId: "ruta-1",
  nombre: "Ruta Centro",
  fecha: new Date("2026-08-25T12:00:00-06:00"),
  cobrador: "Cobrador Demo",
  localidades: ["Centro, Puebla"],
  clientes: [
    {
      orden: 1,
      nombreCompleto: "Cliente Demo",
      numeroTarjeta: "001",
      localidad: "Centro, Puebla",
      direccion: "Calle Principal 10",
      telefono: "222 000 0000",
      saldo: 700,
      abonoAcordado: 100,
      vencido: 100,
      cobrarHoy: 200,
      diasRetardo: 7,
      resultado: "PAGO",
      montoRecibido: 60,
      diferencia: 140,
      motivoNoCobro: null,
      promesaPagoFecha: null,
      promesaPagoMonto: null,
      fueraDeRuta: false,
    },
  ],
  totales: {
    saldo: 700,
    vencido: 100,
    cobrarHoy: 200,
    recibido: 60,
    diferencia: 140,
  },
};

describe("documentos PDF de ruta", () => {
  it.each(["HOJA", "RESULTADO"] as const)(
    "genera un PDF válido para %s",
    async (tipo) => {
      const destino = new PassThrough();
      const partes: Buffer[] = [];
      destino.on("data", (parte) => partes.push(Buffer.from(parte)));
      const terminado = new Promise<void>((resolver, rechazar) => {
        destino.on("end", resolver);
        destino.on("error", rechazar);
      });

      transmitirDocumentoRutaPdf(destino, datos, tipo);
      await terminado;
      const documento = Buffer.concat(partes);

      expect(documento.subarray(0, 5).toString()).toBe("%PDF-");
      expect(documento.subarray(-20).toString()).toContain("%%EOF");
      expect(documento.byteLength).toBeGreaterThan(1_000);
    },
  );
});
