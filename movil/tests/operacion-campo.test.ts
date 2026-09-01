import { describe, expect, it } from "vitest";

import { prepararDatosProducto } from "../src/modulos/inventario/dominioInventario";
import {
  aplicarVisitaLocal,
  crearOperacionesVisita,
} from "../src/modulos/jornada/dominioJornada";
import {
  crearDatosNuevoPedido,
  crearDatosEntrega,
  proyectarEntregaEnJornada,
  totalPedido,
  validarEntrega,
  validarNuevoPedido,
} from "../src/modulos/pedidos/dominioPedidos";
import {
  calcularImportes,
  cambiarCantidadCarrito,
  crearDatosVenta,
  descontarCatalogo,
  filtrarCatalogo,
  proyectarSaldoVenta,
  validarVenta,
} from "../src/modulos/ventas/dominioVenta";
import type { Jornada, PedidoMovil, ProductoMovil } from "../src/tipos";

const producto: ProductoMovil = {
  id: "producto-1",
  sku: "COL-AZ-01",
  nombre: "Colcha Azul",
  marca: "Nexo",
  existencia: 2,
  precioVenta: "33.33",
  actualizadoEn: "2026-08-20T00:00:00.000Z",
};

function jornada(): Jornada {
  return {
    id: "ruta-1",
    nombre: "Ruta Centro",
    fecha: "2026-08-20",
    clientes: [
      {
        id: "cliente-1",
        nombreCompleto: "Ana Pérez",
        numeroTarjeta: "T-100",
        telefono: "5555555555",
        direccion: "Calle 1",
        orden: 1,
        saldo: { saldoActual: "100.01" },
        visita: null,
        pedidos: [
          {
            id: "pedido-1",
            folio: "P-1",
            estado: "LISTO_ENTREGA",
            items: [],
          },
        ],
        ventas: [],
        abonos: [],
        evaluacionesRiesgo: [],
      },
    ],
  };
}

const pedido: PedidoMovil = {
  id: "pedido-1",
  folio: "P-1",
  estado: "LISTO_ENTREGA",
  clienteId: "cliente-1",
  items: [
    {
      id: "item-1",
      descripcion: "Colcha",
      cantidad: 3,
      precioEstimado: "33.33",
    },
  ],
};

describe("venta de campo y proyección de deuda", () => {
  it("nunca permite agregar más piezas que la existencia local", () => {
    let carrito = cambiarCantidadCarrito([], producto, 1);
    carrito = cambiarCantidadCarrito(carrito, producto, 5);
    expect(carrito[0]?.cantidad).toBe(2);
    carrito = cambiarCantidadCarrito(carrito, producto, -2);
    expect(carrito).toEqual([]);
  });

  it("excluye productos agotados y busca por SKU", () => {
    const agotado = { ...producto, id: "producto-2", existencia: 0 };
    expect(filtrarCatalogo([agotado, producto], "col-az")).toEqual([producto]);
  });

  it("calcula crédito y anticipo exactamente a centavos", () => {
    const carrito = [{ ...producto, cantidad: 3 }];
    expect(calcularImportes(carrito, "CREDITO", "10")).toEqual({
      total: 99.99,
      anticipoNumero: 10,
      anticipoValido: true,
      financiado: 89.99,
    });
  });

  it("una venta de contado jamás incrementa el saldo", () => {
    const carrito = [{ ...producto, cantidad: 2 }];
    expect(calcularImportes(carrito, "CONTADO", "0").financiado).toBe(0);
  });

  it("impide crédito sin cliente, tarjeta o plan de pago", () => {
    const carrito = [{ ...producto, cantidad: 1 }];
    expect(
      validarVenta({
        carrito,
        tipo: "CREDITO",
        total: 33.33,
        anticipo: 0,
        numeroTarjeta: "",
        cuota: "",
        primerVencimiento: "",
      }),
    ).toBe("TARJETA");
    expect(
      validarVenta({
        carrito,
        tipo: "CREDITO",
        clienteId: "cliente-1",
        total: 33.33,
        anticipo: 0,
        numeroTarjeta: "T-100",
        cuota: "",
        primerVencimiento: "2026-08-27",
      }),
    ).toBe("CREDITO");
  });

  it("genera contado sin tarjeta ni plan aunque existan valores en el formulario", () => {
    const datos = crearDatosVenta({
      tipo: "CONTADO",
      anticipo: 12,
      numeroTarjeta: "NO-DEBE-VIAJAR",
      carrito: [{ ...producto, cantidad: 1 }],
      periodicidad: "SEMANAL",
      cuota: "10",
      primerVencimiento: "2026-08-27",
      fechaVenta: "2026-08-20T12:00:00.000Z",
    });
    expect(datos.anticipo).toBe(0);
    expect(datos.numeroTarjeta).toBeUndefined();
    expect(datos.plan).toBeUndefined();
  });

  it("genera crédito exclusivamente con productos registrados", () => {
    const datos = crearDatosVenta({
      clienteId: "cliente-1",
      tipo: "CREDITO",
      anticipo: 3.33,
      numeroTarjeta: " T-100 ",
      carrito: [{ ...producto, cantidad: 2 }],
      periodicidad: "SEMANAL",
      cuota: "10",
      primerVencimiento: "2026-08-27",
      fechaVenta: "2026-08-20T12:00:00.000Z",
    });
    expect(datos.numeroTarjeta).toBe("T-100");
    expect(datos.items).toEqual([
      { productoId: "producto-1", cantidad: 2, precioUnitario: 33.33 },
    ]);
    expect(datos.plan).toMatchObject({
      periodicidad: "SEMANAL",
      montoCuota: 10,
    });
  });

  it("descuenta inventario local y suma sólo lo financiado al saldo", () => {
    const carrito = [{ ...producto, cantidad: 2 }];
    expect(descontarCatalogo([producto], carrito)[0]?.existencia).toBe(0);
    const proyectada = proyectarSaldoVenta(jornada(), "cliente-1", 89.99);
    expect(proyectada.clientes[0]?.saldo?.saldoActual).toBe("190");
  });
});

describe("abonos y entregas offline", () => {
  it("crea visita y abono ligados para sincronización idempotente", () => {
    const operaciones = crearOperacionesVisita({
      visitaId: "visita-1",
      abonoId: "abono-1",
      rutaId: "ruta-1",
      clienteId: "cliente-1",
      fechaProgramada: "2026-08-20T12:00:00.000Z",
      fechaVisita: "2026-08-20T13:00:00.000Z",
      resultado: "PAGO",
      monto: 20.01,
      metodo: "EFECTIVO",
    });
    expect(operaciones.map((operacion) => operacion.tipo)).toEqual([
      "VISITA",
      "ABONO",
    ]);
    expect(operaciones[1]?.visitaOperacionId).toBe("visita-1");
  });

  it("un abono baja el saldo local y queda visible inmediatamente", () => {
    const actualizada = aplicarVisitaLocal(
      jornada(),
      "cliente-1",
      "PAGO",
      20.02,
      "2026-08-20T13:00:00.000Z",
    );
    expect(actualizada.clientes[0]?.saldo?.saldoActual).toBe("79.99");
    expect(actualizada.clientes[0]?.abonos[0]?.monto).toBe("20.02");
    expect(actualizada.clientes[0]?.visita?.resultado).toBe("PAGO");
  });

  it("no modifica el saldo cuando la visita termina sin pago", () => {
    const actualizada = aplicarVisitaLocal(
      jornada(),
      "cliente-1",
      "NO_PAGO",
      0,
      "2026-08-20T13:00:00.000Z",
    );
    expect(actualizada.clientes[0]?.saldo?.saldoActual).toBe("100.01");
    expect(actualizada.clientes[0]?.abonos).toHaveLength(0);
  });

  it("al entregar retira el pedido y suma exactamente la deuda financiada", () => {
    expect(totalPedido(pedido)).toBe(99.99);
    const actualizada = proyectarEntregaEnJornada(
      jornada(),
      "cliente-1",
      "pedido-1",
      89.99,
    );
    expect(actualizada.clientes[0]?.pedidos).toHaveLength(0);
    expect(actualizada.clientes[0]?.saldo?.saldoActual).toBe("190");
  });

  it("exige tarjeta y plan únicamente cuando queda deuda", () => {
    expect(validarEntrega(100, "CREDITO", 0, "10", "2026-08-27", "")).toBe(
      "TARJETA",
    );
    expect(validarEntrega(100, "CREDITO", 100, "", "", "")).toBeNull();
    expect(validarEntrega(100, "CONTADO", 0, "", "", "")).toBeNull();
  });

  it("forma tarjeta y plan sin permitir cambiar proveedor en la entrega", () => {
    const datos = crearDatosEntrega({
      pedidoId: "pedido-1",
      tipo: "CREDITO",
      anticipo: 9.99,
      total: 99.99,
      numeroTarjeta: " T-100 ",
      periodicidad: "SEMANAL",
      cuota: "10",
      fecha: "2026-08-27",
      fechaEntrega: "2026-08-20T13:00:00.000Z",
    });
    expect(datos.numeroTarjeta).toBe("T-100");
    expect(datos).not.toHaveProperty("proveedores");
    expect(datos.plan).toBeDefined();
  });
});

describe("captura móvil de pedidos reales", () => {
  const borrador = {
    clienteId: "cliente-1",
    productoId: "producto-1",
    cantidad: "2",
    fechaCompromiso: "2026-09-05",
    notas: "Entregar por la tarde",
  };

  it("exige cliente, producto y una cantidad entera positiva", () => {
    expect(validarNuevoPedido({ ...borrador, clienteId: "" })).toBe("CLIENTE");
    expect(validarNuevoPedido({ ...borrador, productoId: "" })).toBe(
      "PRODUCTO",
    );
    expect(validarNuevoPedido({ ...borrador, cantidad: "" })).toBe("CANTIDAD");
    expect(validarNuevoPedido({ ...borrador, cantidad: "1.5" })).toBe(
      "CANTIDAD",
    );
  });

  it("conserva la captura y construye el contrato del backend", () => {
    expect(validarNuevoPedido(borrador)).toBeNull();
    expect(crearDatosNuevoPedido(borrador)).toEqual({
      clienteId: "cliente-1",
      items: [{ productoId: "producto-1", cantidad: 2 }],
      fechaCompromiso: new Date("2026-09-05T12:00:00").toISOString(),
      notas: "Entregar por la tarde",
    });
  });
});

describe("captura móvil de producto con fotografía", () => {
  const borrador = {
    nombre: "Colcha Azul",
    marca: "Vektra",
    sku: "COL-AZ-01",
    categoriaId: "categoria-colchas",
    codigoBarras: "750000000001",
    codigoQr: "QR-COL-AZ-01",
    precioCompra: "500,25",
    precioVenta: "899.90",
    existenciaInicial: "4",
    existenciaMinima: "1",
  };

  it("normaliza foto JPEG y datos en una sola alta", () => {
    const resultado = prepararDatosProducto(borrador, {
      editando: false,
      foto: {
        uri: "file:///producto.jpg",
        nombre: "producto.jpg",
        mime: "image/jpeg",
        base64: "YWJj",
      },
    });
    expect(resultado.exito).toBe(true);
    if (!resultado.exito) return;
    expect(resultado.datos).toMatchObject({
      precioCompra: 500.25,
      precioVenta: 899.9,
      existenciaInicial: 4,
      categoriaId: "categoria-colchas",
      foto: { mime: "image/jpeg", base64: "YWJj" },
    });
  });

  it("rechaza precio inválido y existencia fraccionaria", () => {
    expect(
      prepararDatosProducto(
        { ...borrador, precioVenta: "0" },
        { editando: false },
      ).exito,
    ).toBe(false);
    expect(
      prepararDatosProducto(
        { ...borrador, existenciaInicial: "1.5" },
        { editando: false },
      ).exito,
    ).toBe(false);
  });
});
