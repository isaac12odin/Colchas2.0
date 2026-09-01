import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  esFechaCalendarioValida,
  esFechaHoyOFutura,
  fechaCalendarioLocal,
  fechaSugeridaPlanPago,
  sumarDiasCalendarioLocal,
} from "../src/utilidades/fechaLocal";
import {
  fechaSugeridaEntregaPractica,
  validarEntregaPractica,
  validarVentaCreditoPractica,
} from "../src/modulos/capacitacion/simuladores/dominio";
import {
  validarNuevoPedido,
  validarEntrega,
} from "../src/modulos/pedidos/dominioPedidos";
import { validarVenta } from "../src/modulos/ventas/dominioVenta";
import type { ProductoMovil } from "../src/tipos";

const zonaOriginal = process.env.TZ;

const producto: ProductoMovil = {
  id: "producto-fechas",
  sku: "PRUEBA-FECHA",
  nombre: "Producto de prueba",
  marca: "Vektra",
  existencia: 5,
  precioVenta: "1000",
  actualizadoEn: "2030-05-10T18:00:00.000Z",
};

describe.sequential("fechas de calendario local en Android", () => {
  beforeAll(() => {
    // La operación principal está en México. Esta prueba impide volver a
    // calcular fechas de negocio con toISOString(), que usa el día UTC.
    process.env.TZ = "America/Mexico_City";
  });

  afterAll(() => {
    vi.useRealTimers();
    if (zonaOriginal === undefined) delete process.env.TZ;
    else process.env.TZ = zonaOriginal;
  });

  it("conserva el día del dispositivo aunque UTC ya esté en el día siguiente", () => {
    const instante = new Date("2026-03-01T01:30:00.000Z");

    expect(instante.getUTCDate()).toBe(1);
    expect(fechaCalendarioLocal(instante)).toBe("2026-02-28");
  });

  it.each([
    [new Date(2026, 0, 31, 23, 55), 1, "2026-02-01"],
    [new Date(2028, 1, 28, 23, 55), 1, "2028-02-29"],
    [new Date(2028, 2, 1, 0, 5), -1, "2028-02-29"],
    [new Date(2026, 11, 31, 23, 55), 1, "2027-01-01"],
  ])(
    "suma días atravesando fin de mes/año sin saltos UTC: %s %+d",
    (origen, dias, esperado) => {
      expect(sumarDiasCalendarioLocal(dias, origen)).toBe(esperado);
    },
  );

  it.each([
    ["2028-02-29", true],
    ["2026-02-29", false],
    ["2026-04-31", false],
    ["2026-13-01", false],
    ["2026-00-10", false],
    ["2026-1-01", false],
    ["texto", false],
  ])("valida una fecha real con formato estricto: %s", (fecha, valida) => {
    expect(esFechaCalendarioValida(fecha)).toBe(valida);
  });

  it("acepta hoy y futuro, pero rechaza pasado o fecha inexistente", () => {
    expect(esFechaHoyOFutura("2030-05-10", "2030-05-10")).toBe(true);
    expect(esFechaHoyOFutura("2030-05-11", "2030-05-10")).toBe(true);
    expect(esFechaHoyOFutura("2030-05-09", "2030-05-10")).toBe(false);
    expect(esFechaHoyOFutura("2030-02-30", "2030-02-01")).toBe(false);
  });

  it("calcula la sugerencia del simulador cruzando el fin de mes", () => {
    const origen = new Date(2030, 0, 28, 23, 30);

    expect(fechaSugeridaEntregaPractica(7, origen)).toBe("2030-02-04");
  });

  it("recalcula el plan al abrirlo y no conserva la fecha del módulo", () => {
    const primeraApertura = new Date(2030, 0, 28, 23, 59);
    const siguienteApertura = new Date(2030, 0, 29, 0, 1);

    expect(fechaSugeridaPlanPago(primeraApertura)).toBe("2030-02-04");
    expect(fechaSugeridaPlanPago(siguienteApertura)).toBe("2030-02-05");
  });

  it("rechaza una fecha pasada en venta, pedido y entrega operativos", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2030, 4, 10, 18, 0, 0));

    expect(
      validarVenta({
        carrito: [{ ...producto, cantidad: 1 }],
        tipo: "CREDITO",
        clienteId: "cliente-1",
        total: 1000,
        anticipo: 200,
        numeroTarjeta: "T-001",
        cuota: "200",
        primerVencimiento: "2030-05-09",
      }),
    ).toBe("CREDITO");
    expect(
      validarNuevoPedido({
        clienteId: "cliente-1",
        productoId: "producto-1",
        cantidad: "1",
        fechaCompromiso: "2030-05-09",
        notas: "",
      }),
    ).toBe("FECHA");
    expect(
      validarEntrega(1000, "CREDITO", 200, "200", "2030-05-09", "T-001"),
    ).toBe("PLAN");
  });

  it("acepta el mismo día local como primer vencimiento", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2030, 4, 10, 23, 59, 0));

    expect(
      validarVenta({
        carrito: [{ ...producto, cantidad: 1 }],
        tipo: "CREDITO",
        clienteId: "cliente-1",
        total: 1000,
        anticipo: 200,
        numeroTarjeta: "T-001",
        cuota: "200",
        primerVencimiento: "2030-05-10",
      }),
    ).toBeNull();
    expect(
      validarEntrega(1000, "CREDITO", 200, "200", "2030-05-10", "T-001"),
    ).toBeNull();
  });

  it("las dos prácticas críticas explican por qué una fecha pasada falla", () => {
    const hoy = new Date(2030, 4, 10, 12, 0, 0);
    const venta = validarVentaCreditoPractica(
      {
        cliente: "ana",
        producto: "colcha",
        cantidad: 1,
        anticipo: 200,
        tarjeta: "T-001",
        cuota: 200,
        periodicidad: "SEMANAL",
        vencimiento: "2030-05-09",
      },
      hoy,
    );
    const entrega = validarEntregaPractica(
      {
        tipo: "CREDITO",
        anticipo: 200,
        tarjeta: "T-001",
        cuota: 200,
        periodicidad: "SEMANAL",
        primerVencimiento: "2030-05-09",
      },
      hoy,
    );

    expect(venta).toMatchObject({
      correcta: false,
      mensaje: { es: expect.stringContaining("pasada") },
    });
    expect(entrega).toMatchObject({
      correcta: false,
      mensaje: { es: expect.stringContaining("pasada") },
    });
  });
});
