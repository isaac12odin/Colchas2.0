import { describe, expect, it, vi } from "vitest";

import {
  aplicarVisitaLocal,
  crearOperacionesVisita,
  type MetodoAbono,
} from "../src/modulos/jornada/dominioJornada";
import {
  crearDatosEntrega,
  proyectarEntregaEnJornada,
} from "../src/modulos/pedidos/dominioPedidos";
import {
  crearDatosVenta,
  proyectarSaldoVenta,
  type MetodoPago,
} from "../src/modulos/ventas/dominioVenta";
import type { Jornada, ProductoMovil } from "../src/tipos";
import { fechaCalendarioLocal } from "../src/utilidades/fechaLocal";

const metodos: readonly MetodoPago[] = [
  "EFECTIVO",
  "TRANSFERENCIA",
  "TARJETA",
  "OTRO",
];

const producto: ProductoMovil = {
  id: "producto-1",
  sku: "COL-001",
  nombre: "Colcha Azul",
  marca: "Vektra",
  existencia: 10,
  precioVenta: "1250.25",
  actualizadoEn: "2030-05-10T18:00:00.000Z",
};

function crearJornada(): Jornada {
  return {
    id: "ruta-1",
    nombre: "Ruta Centro",
    fecha: "2030-05-10",
    clientes: [
      {
        id: "cliente-1",
        nombreCompleto: "Ana Pérez",
        numeroTarjeta: "T-001",
        telefono: "5551112233",
        direccion: "Calle Uno",
        orden: 1,
        saldo: { saldoActual: "100.01" },
        visita: null,
        pedidos: [
          {
            id: "pedido-entregar",
            folio: "PED-001",
            estado: "LISTO_ENTREGA",
            items: [],
          },
          {
            id: "pedido-conservar",
            folio: "PED-002",
            estado: "PENDIENTE_PEDIR",
            items: [],
          },
        ],
        ventas: [],
        abonos: [],
        evaluacionesRiesgo: [],
        estadoCuenta: {
          saldoTotal: 100.01,
          abonoPeriodico: 25,
          vencido: 60,
          venceHoy: 40.01,
          cobrarHoy: 100.01,
          proximoVencimiento: null,
          cuotasVencidas: 2,
        },
      },
      {
        id: "cliente-2",
        nombreCompleto: "Beatriz López",
        telefono: "5554445566",
        direccion: "Calle Dos",
        orden: 2,
        saldo: { saldoActual: "88.88" },
        visita: null,
        pedidos: [],
        ventas: [],
        abonos: [],
        evaluacionesRiesgo: [],
      },
    ],
  };
}

function datosOperacionAbono(metodo: MetodoAbono) {
  return crearOperacionesVisita({
    visitaId: `visita-${metodo}`,
    abonoId: `abono-${metodo}`,
    rutaId: "ruta-1",
    clienteId: "cliente-1",
    fechaProgramada: "2030-05-10T12:00:00.000Z",
    fechaVisita: "2030-05-10T18:00:00.000Z",
    resultado: "PAGO",
    monto: 25.5,
    metodo,
    referencia: `REF-${metodo}`,
    notas: "Captura de prueba",
  });
}

describe("contrato offline de métodos de abono", () => {
  it.each(metodos)("conserva el método %s y su referencia", (metodo) => {
    const operaciones = datosOperacionAbono(metodo);

    expect(operaciones).toHaveLength(2);
    expect(operaciones[0]).toMatchObject({
      tipo: "VISITA",
      id: `visita-${metodo}`,
    });
    expect(operaciones[1]).toMatchObject({
      tipo: "ABONO",
      id: `abono-${metodo}`,
      visitaOperacionId: `visita-${metodo}`,
      datos: {
        clienteId: "cliente-1",
        monto: 25.5,
        metodo,
        referencia: `REF-${metodo}`,
        notas: "Captura de prueba",
        fechaAbono: "2030-05-10T18:00:00.000Z",
      },
    });
  });

  it.each(["NO_PAGO", "AUSENTE"] as const)(
    "no fabrica un abono cuando el resultado es %s",
    (resultado) => {
      const operaciones = crearOperacionesVisita({
        visitaId: `visita-${resultado}`,
        abonoId: `abono-no-valido-${resultado}`,
        rutaId: "ruta-1",
        clienteId: "cliente-1",
        fechaProgramada: "2030-05-10T12:00:00.000Z",
        fechaVisita: "2030-05-10T18:00:00.000Z",
        resultado,
        monto: 50,
        metodo: "EFECTIVO",
      });

      expect(operaciones.map(({ tipo }) => tipo)).toEqual(["VISITA"]);
    },
  );

  it("no fabrica un abono sin identificador idempotente", () => {
    const operaciones = crearOperacionesVisita({
      visitaId: "visita-sin-abono",
      rutaId: "ruta-1",
      clienteId: "cliente-1",
      fechaProgramada: "2030-05-10T12:00:00.000Z",
      fechaVisita: "2030-05-10T18:00:00.000Z",
      resultado: "PAGO",
      monto: 50,
      metodo: "EFECTIVO",
    });

    expect(operaciones.map(({ tipo }) => tipo)).toEqual(["VISITA"]);
  });
});

describe("método del anticipo en venta y entrega", () => {
  it.each(metodos)("envía %s en una venta a crédito", (metodoAnticipo) => {
    const datos = crearDatosVenta({
      clienteId: "cliente-1",
      tipo: "CREDITO",
      anticipo: 250.25,
      numeroTarjeta: " T-001 ",
      carrito: [{ ...producto, cantidad: 1 }],
      periodicidad: "SEMANAL",
      cuota: "200",
      primerVencimiento: "2030-05-17",
      fechaVenta: "2030-05-10T18:00:00.000Z",
      metodoAnticipo,
    });

    expect(datos).toMatchObject({
      anticipo: 250.25,
      metodoAnticipo,
      numeroTarjeta: "T-001",
    });
  });

  it.each(metodos)("envía %s en la entrega de un pedido", (metodoAnticipo) => {
    const datos = crearDatosEntrega({
      pedidoId: "pedido-entregar",
      tipo: "CREDITO",
      anticipo: 250.25,
      total: 1250.25,
      numeroTarjeta: " T-001 ",
      periodicidad: "SEMANAL",
      cuota: "200",
      fecha: "2030-05-17",
      fechaEntrega: "2030-05-10T18:00:00.000Z",
      metodoAnticipo,
    });

    expect(datos).toMatchObject({
      pedidoId: "pedido-entregar",
      anticipo: 250.25,
      metodoAnticipo,
      numeroTarjeta: "T-001",
    });
  });

  it("usa efectivo como valor compatible cuando no se especifica método", () => {
    const venta = crearDatosVenta({
      clienteId: "cliente-1",
      tipo: "CREDITO",
      anticipo: 250.25,
      numeroTarjeta: "T-001",
      carrito: [{ ...producto, cantidad: 1 }],
      periodicidad: "SEMANAL",
      cuota: "200",
      primerVencimiento: "2030-05-17",
      fechaVenta: "2030-05-10T18:00:00.000Z",
    });
    const entrega = crearDatosEntrega({
      pedidoId: "pedido-entregar",
      tipo: "CREDITO",
      anticipo: 250.25,
      total: 1250.25,
      numeroTarjeta: "T-001",
      periodicidad: "SEMANAL",
      cuota: "200",
      fecha: "2030-05-17",
      fechaEntrega: "2030-05-10T18:00:00.000Z",
    });

    expect(venta.metodoAnticipo).toBe("EFECTIVO");
    expect(entrega.metodoAnticipo).toBe("EFECTIVO");
  });

  it("clasifica una venta sin cliente como público general", () => {
    const venta = crearDatosVenta({
      tipo: "CONTADO",
      anticipo: 0,
      numeroTarjeta: "",
      carrito: [{ ...producto, cantidad: 1 }],
      periodicidad: "SEMANAL",
      cuota: "",
      primerVencimiento: "2030-05-17",
      fechaVenta: "2030-05-10T18:00:00.000Z",
      metodoAnticipo: "TARJETA",
    });

    expect(venta).toMatchObject({
      clienteId: null,
      tipo: "PUBLICO",
      metodoAnticipo: "TARJETA",
    });
  });

  it("normaliza a contado un crédito cubierto completamente al entregar", () => {
    const entrega = crearDatosEntrega({
      pedidoId: "pedido-entregar",
      tipo: "CREDITO",
      anticipo: 1250.25,
      total: 1250.25,
      numeroTarjeta: "T-001",
      periodicidad: "SEMANAL",
      cuota: "200",
      fecha: "2030-05-17",
      fechaEntrega: "2030-05-10T18:00:00.000Z",
      metodoAnticipo: "TRANSFERENCIA",
    });

    expect(entrega).toMatchObject({
      tipo: "CONTADO",
      anticipo: 0,
      metodoAnticipo: "TRANSFERENCIA",
    });
    expect(entrega).not.toHaveProperty("plan");
  });
});

describe("proyección inmediata de saldos", () => {
  it("suma sólo el monto financiado al cliente objetivo sin mutar la jornada", () => {
    const original = crearJornada();
    const proyectada = proyectarSaldoVenta(original, "cliente-1", 149.99);

    expect(original.clientes[0]?.saldo?.saldoActual).toBe("100.01");
    expect(proyectada).not.toBe(original);
    expect(proyectada.clientes[0]?.saldo?.saldoActual).toBe("250");
    expect(proyectada.clientes[0]?.estadoCuenta?.saldoTotal).toBe(250);
    expect(proyectada.clientes[1]?.saldo?.saldoActual).toBe("88.88");
  });

  it("una venta de contado proyectada con cero deja el saldo intacto", () => {
    const proyectada = proyectarSaldoVenta(crearJornada(), "cliente-1", 0);

    expect(proyectada.clientes[0]?.saldo?.saldoActual).toBe("100.01");
  });

  it("una primera venta con vencimiento hoy actualiza la agenda completa", () => {
    const original = crearJornada();
    const cliente = original.clientes[1]!;
    cliente.saldo = { saldoActual: "0" };
    cliente.estadoCuenta = {
      saldoTotal: 0,
      abonoPeriodico: 0,
      vencido: 0,
      venceHoy: 0,
      cobrarHoy: 0,
      proximoVencimiento: null,
      cuotasVencidas: 0,
      vencimientos: [],
    };
    const hoy = fechaCalendarioLocal();
    const proyectada = proyectarSaldoVenta(original, "cliente-2", 500, {
      periodicidad: "SEMANAL",
      montoCuota: 200,
      primerVencimiento: hoy,
    });

    expect(proyectada.clientes[1]?.estadoCuenta).toMatchObject({
      saldoTotal: 500,
      abonoPeriodico: 200,
      venceHoy: 200,
      cobrarHoy: 200,
    });
    expect(proyectada.clientes[1]?.estadoCuenta?.vencimientos).toHaveLength(3);
  });

  it("una entrega elimina sólo el pedido entregado y suma la deuda exacta", () => {
    const original = crearJornada();
    const proyectada = proyectarEntregaEnJornada(
      original,
      "cliente-1",
      "pedido-entregar",
      1000,
    );

    expect(original.clientes[0]?.pedidos).toHaveLength(2);
    expect(proyectada.clientes[0]?.pedidos.map(({ id }) => id)).toEqual([
      "pedido-conservar",
    ]);
    expect(proyectada.clientes[0]?.saldo?.saldoActual).toBe("1100.01");
    expect(proyectada.clientes[0]?.estadoCuenta?.saldoTotal).toBe(1100.01);
    expect(proyectada.clientes[1]?.saldo?.saldoActual).toBe("88.88");
  });

  it("un abono nunca deja saldo negativo", () => {
    const proyectada = aplicarVisitaLocal(
      crearJornada(),
      "cliente-1",
      "PAGO",
      500,
      "2030-05-10T18:00:00.000Z",
    );

    expect(proyectada.clientes[0]?.saldo?.saldoActual).toBe("0");
    expect(proyectada.clientes[0]?.abonos[0]?.monto).toBe("500");
    expect(proyectada.clientes[0]?.estadoCuenta).toMatchObject({
      saldoTotal: 0,
      vencido: 0,
      venceHoy: 0,
      cobrarHoy: 0,
      cuotasVencidas: 0,
    });
  });

  it("un abono parcial actualiza agenda y monto sugerido inmediatamente", () => {
    const proyectada = aplicarVisitaLocal(
      crearJornada(),
      "cliente-1",
      "PAGO",
      75,
      "2030-05-10T18:00:00.000Z",
    );

    expect(proyectada.clientes[0]?.saldo?.saldoActual).toBe("25.01");
    expect(proyectada.clientes[0]?.estadoCuenta).toMatchObject({
      saldoTotal: 25.01,
      vencido: 0,
      venceHoy: 25.01,
      cobrarHoy: 25.01,
      cuotasVencidas: 0,
    });
  });

  it("al liquidar una de dos cuotas vencidas reduce también su contador", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2030, 4, 10, 12, 0, 0));
    try {
      const original = crearJornada();
      original.clientes[0]!.saldo = { saldoActual: "60" };
      original.clientes[0]!.estadoCuenta = {
        saldoTotal: 60,
        abonoPeriodico: 30,
        vencido: 60,
        venceHoy: 0,
        cobrarHoy: 60,
        proximoVencimiento: null,
        cuotasVencidas: 2,
        vencimientos: [
          {
            cuotaId: "cuota-1",
            fecha: "2030-05-08",
            esperado: 30,
            recibido: 0,
            diferencia: 30,
            diasRetardo: 2,
            estado: "VENCIDO",
          },
          {
            cuotaId: "cuota-2",
            fecha: "2030-05-09",
            esperado: 30,
            recibido: 0,
            diferencia: 30,
            diasRetardo: 1,
            estado: "VENCIDO",
          },
        ],
      };

      const proyectada = aplicarVisitaLocal(
        original,
        "cliente-1",
        "PAGO",
        30,
        "2030-05-10T18:00:00.000Z",
      );

      expect(proyectada.clientes[0]?.estadoCuenta).toMatchObject({
        saldoTotal: 30,
        vencido: 30,
        cobrarHoy: 30,
        cuotasVencidas: 1,
      });
      expect(
        proyectada.clientes[0]?.estadoCuenta?.vencimientos?.map(
          ({ estado }) => estado,
        ),
      ).toEqual(["PAGADO", "VENCIDO"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each(["NO_PAGO", "AUSENTE"] as const)(
    "%s no altera deuda aunque llegue un monto defensivamente",
    (resultado) => {
      const proyectada = aplicarVisitaLocal(
        crearJornada(),
        "cliente-1",
        resultado,
        50,
        "2030-05-10T18:00:00.000Z",
      );

      expect(proyectada.clientes[0]?.saldo?.saldoActual).toBe("100.01");
      expect(proyectada.clientes[0]?.abonos).toHaveLength(0);
      expect(proyectada.clientes[0]?.estadoCuenta?.cobrarHoy).toBe(100.01);
    },
  );
});
