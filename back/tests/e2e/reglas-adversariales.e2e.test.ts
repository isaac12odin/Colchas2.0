import { randomUUID } from "node:crypto";

import { RolUsuario } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { app } from "../../src/app.js";
import { fechaMexicoISO } from "../../src/compartido/fechas.js";
import { prisma } from "../../src/infraestructura/prisma.js";
import {
  asegurarBaseDePruebas,
  cabeceras,
  EscenarioPrueba,
} from "./escenario.js";

const evidenciaValida = {
  nombre: "evidencia.png",
  mime: "image/png",
  base64:
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
};

beforeAll(asegurarBaseDePruebas);
afterAll(() => prisma.$disconnect());

async function conEscenario(
  ejecutar: (escenario: EscenarioPrueba) => Promise<void>,
) {
  const escenario = new EscenarioPrueba();
  try {
    await ejecutar(escenario);
  } finally {
    await escenario.limpiar();
  }
}

describe.sequential("ventas e inventario bajo condiciones adversas", () => {
  it("rechaza stock insuficiente sin crear venta ni movimiento", () =>
    conEscenario(async (escenario) => {
      const admin = await escenario.crearUsuario(RolUsuario.ADMINISTRADOR);
      const producto = await escenario.crearProducto({ existencia: 1 });
      const respuesta = await request(app)
        .post("/api/v1/ventas")
        .set(cabeceras(admin.token))
        .send({
          tipo: "PUBLICO",
          items: [{ productoId: producto.id, cantidad: 2 }],
        })
        .expect(409);
      expect(respuesta.body.error.codigo).toBe("STOCK_INSUFICIENTE");
      expect(
        (
          await prisma.producto.findUniqueOrThrow({
            where: { id: producto.id },
          })
        ).existencia,
      ).toBe(1);
      expect(await prisma.venta.count({ where: { usuarioId: admin.id } })).toBe(
        0,
      );
      expect(
        await prisma.movimientoInventario.count({
          where: { productoId: producto.id },
        }),
      ).toBe(0);
    }));

  it("rechaza crédito sin cliente", () =>
    conEscenario(async (escenario) => {
      const admin = await escenario.crearUsuario(RolUsuario.ADMINISTRADOR);
      const producto = await escenario.crearProducto({ existencia: 2 });
      const respuesta = await request(app)
        .post("/api/v1/ventas")
        .set(cabeceras(admin.token))
        .send({
          tipo: "CREDITO",
          items: [{ productoId: producto.id, cantidad: 1 }],
          plan: {
            periodicidad: "SEMANAL",
            montoCuota: 100,
            primerVencimiento: new Date(),
          },
        })
        .expect(422);
      expect(respuesta.body.error.codigo).toBe("CLIENTE_REQUERIDO");
    }));

  it("rechaza crédito financiado sin calendario", () =>
    conEscenario(async (escenario) => {
      const admin = await escenario.crearUsuario(RolUsuario.ADMINISTRADOR);
      const localidad = await escenario.crearLocalidad();
      const cliente = await escenario.crearCliente(localidad.id);
      const producto = await escenario.crearProducto({ existencia: 2 });
      const respuesta = await request(app)
        .post("/api/v1/ventas")
        .set(cabeceras(admin.token))
        .send({
          tipo: "CREDITO",
          clienteId: cliente.id,
          numeroTarjeta: `PLAN-${escenario.marca}`,
          items: [{ productoId: producto.id, cantidad: 1 }],
        })
        .expect(422);
      expect(respuesta.body.error.codigo).toBe("PLAN_REQUERIDO");
    }));

  it("rechaza crédito sin tarjeta manual y no inventa una", () =>
    conEscenario(async (escenario) => {
      const admin = await escenario.crearUsuario(RolUsuario.ADMINISTRADOR);
      const localidad = await escenario.crearLocalidad();
      const cliente = await escenario.crearCliente(localidad.id);
      const producto = await escenario.crearProducto({ existencia: 2 });
      const respuesta = await request(app)
        .post("/api/v1/ventas")
        .set(cabeceras(admin.token))
        .send({
          tipo: "CREDITO",
          clienteId: cliente.id,
          items: [{ productoId: producto.id, cantidad: 1 }],
          plan: {
            periodicidad: "SEMANAL",
            montoCuota: 100,
            primerVencimiento: new Date(),
          },
        })
        .expect(422);
      expect(respuesta.body.error.codigo).toBe("TARJETA_REQUERIDA");
      expect(
        (await prisma.cliente.findUniqueOrThrow({ where: { id: cliente.id } }))
          .numeroTarjeta,
      ).toBeNull();
    }));

  it("respeta el límite de crédito y revierte la reserva de stock", () =>
    conEscenario(async (escenario) => {
      const admin = await escenario.crearUsuario(RolUsuario.ADMINISTRADOR);
      const localidad = await escenario.crearLocalidad();
      const cliente = await escenario.crearCliente(localidad.id);
      await prisma.cliente.update({
        where: { id: cliente.id },
        data: { limiteCredito: 300 },
      });
      const producto = await escenario.crearProducto({
        existencia: 4,
        precio: 400,
      });
      const respuesta = await request(app)
        .post("/api/v1/ventas")
        .set(cabeceras(admin.token))
        .send({
          tipo: "CREDITO",
          clienteId: cliente.id,
          numeroTarjeta: `LIM-${escenario.marca}`,
          items: [{ productoId: producto.id, cantidad: 1 }],
          plan: {
            periodicidad: "SEMANAL",
            montoCuota: 100,
            primerVencimiento: new Date(),
          },
        })
        .expect(422);
      expect(respuesta.body.error.codigo).toBe("LIMITE_CREDITO");
      expect(
        (
          await prisma.producto.findUniqueOrThrow({
            where: { id: producto.id },
          })
        ).existencia,
      ).toBe(4);
    }));

  it("rechaza líneas duplicadas del mismo producto", () =>
    conEscenario(async (escenario) => {
      const admin = await escenario.crearUsuario(RolUsuario.ADMINISTRADOR);
      const producto = await escenario.crearProducto({ existencia: 5 });
      const respuesta = await request(app)
        .post("/api/v1/ventas")
        .set(cabeceras(admin.token))
        .send({
          tipo: "PUBLICO",
          items: [
            { productoId: producto.id, cantidad: 1 },
            { productoId: producto.id, cantidad: 1 },
          ],
        })
        .expect(422);
      expect(respuesta.body.error.codigo).toBe("PRODUCTO_REPETIDO");
    }));

  it("resuelve dos ventas concurrentes sin permitir sobreventa", () =>
    conEscenario(async (escenario) => {
      const admin = await escenario.crearUsuario(RolUsuario.ADMINISTRADOR);
      const producto = await escenario.crearProducto({ existencia: 1 });
      const vender = () =>
        request(app)
          .post("/api/v1/ventas")
          .set(cabeceras(admin.token))
          .send({
            tipo: "PUBLICO",
            idOperacionMovil: `concurrente-${randomUUID()}`,
            items: [{ productoId: producto.id, cantidad: 1 }],
          });
      const respuestas = await Promise.all([vender(), vender()]);
      expect(respuestas.map(({ status }) => status).sort()).toEqual([201, 409]);
      expect(
        (
          await prisma.producto.findUniqueOrThrow({
            where: { id: producto.id },
          })
        ).existencia,
      ).toBe(0);
      expect(await prisma.venta.count({ where: { usuarioId: admin.id } })).toBe(
        1,
      );
    }));

  it("conserva snapshots históricos aunque el producto cambie y se dé de baja", () =>
    conEscenario(async (escenario) => {
      const admin = await escenario.crearUsuario(RolUsuario.ADMINISTRADOR);
      const producto = await escenario.crearProducto({
        existencia: 3,
        precio: 250,
      });
      const nombreOriginal = producto.nombre;
      const venta = await request(app)
        .post("/api/v1/ventas")
        .set(cabeceras(admin.token))
        .send({
          tipo: "PUBLICO",
          items: [{ productoId: producto.id, cantidad: 1 }],
        })
        .expect(201);
      await request(app)
        .patch(`/api/v1/inventario/productos/${producto.id}`)
        .set(cabeceras(admin.token))
        .send({ nombre: "Nombre actualizado", precioVenta: 999 })
        .expect(200);
      await request(app)
        .delete(`/api/v1/inventario/productos/${producto.id}`)
        .set(cabeceras(admin.token))
        .expect(204);
      const historica = await request(app)
        .get(`/api/v1/ventas/${venta.body.id}`)
        .set(cabeceras(admin.token))
        .expect(200);
      expect(historica.body.detalles[0].productoNombre).toBe(nombreOriginal);
      expect(Number(historica.body.detalles[0].precioUnitario)).toBe(250);
    }));

  it("impide que vendedor o cobrador decidan precios y descuentos por API", () =>
    conEscenario(async (escenario) => {
      const vendedor = await escenario.crearUsuario(RolUsuario.VENDEDOR);
      const producto = await escenario.crearProducto({
        existencia: 5,
        precio: 300,
      });
      const precioAlterado = await request(app)
        .post("/api/v1/ventas")
        .set(cabeceras(vendedor.token))
        .send({
          tipo: "PUBLICO",
          items: [
            { productoId: producto.id, cantidad: 1, precioUnitario: 0.01 },
          ],
        })
        .expect(403);
      expect(precioAlterado.body.error.codigo).toBe("PRECIO_NO_AUTORIZADO");

      const descuento = await request(app)
        .post("/api/v1/ventas")
        .set(cabeceras(vendedor.token))
        .send({
          tipo: "PUBLICO",
          descuento: 1,
          items: [{ productoId: producto.id, cantidad: 1 }],
        })
        .expect(403);
      expect(descuento.body.error.codigo).toBe("DESCUENTO_NO_AUTORIZADO");
      expect(
        await prisma.venta.count({ where: { usuarioId: vendedor.id } }),
      ).toBe(0);
      expect(
        (
          await prisma.producto.findUniqueOrThrow({
            where: { id: producto.id },
          })
        ).existencia,
      ).toBe(5);
    }));

  it("ni el administrador puede confirmar una venta por debajo del costo", () =>
    conEscenario(async (escenario) => {
      const admin = await escenario.crearUsuario(RolUsuario.ADMINISTRADOR);
      const producto = await escenario.crearProducto({
        existencia: 2,
        precio: 300,
      });
      const respuesta = await request(app)
        .post("/api/v1/ventas")
        .set(cabeceras(admin.token))
        .send({
          tipo: "PUBLICO",
          items: [
            { productoId: producto.id, cantidad: 1, precioUnitario: 100 },
          ],
        })
        .expect(422);
      expect(respuesta.body.error.codigo).toBe("PRECIO_BAJO_COSTO");
    }));

  it("impide dar de baja un producto incluido en un pedido pendiente", () =>
    conEscenario(async (escenario) => {
      const admin = await escenario.crearUsuario(RolUsuario.ADMINISTRADOR);
      const localidad = await escenario.crearLocalidad();
      const cliente = await escenario.crearCliente(localidad.id);
      const producto = await escenario.crearProducto({ existencia: 3 });
      const pedido = await request(app)
        .post("/api/v1/pedidos")
        .set(cabeceras(admin.token))
        .send({
          clienteId: cliente.id,
          items: [{ productoId: producto.id, cantidad: 1 }],
        })
        .expect(201);
      const bloqueada = await request(app)
        .delete(`/api/v1/inventario/productos/${producto.id}`)
        .set(cabeceras(admin.token))
        .expect(409);
      expect(bloqueada.body.error.codigo).toBe("PRODUCTO_CON_PEDIDOS");
      await request(app)
        .patch(`/api/v1/pedidos/${pedido.body.id}/estado`)
        .set(cabeceras(admin.token))
        .send({ estado: "CANCELADO" })
        .expect(200);
      await request(app)
        .delete(`/api/v1/inventario/productos/${producto.id}`)
        .set(cabeceras(admin.token))
        .expect(204);
    }));
});

describe.sequential("abonos y saldo bajo condiciones adversas", () => {
  it("rechaza un abono mayor al saldo sin alterar totales", () =>
    conEscenario(async (escenario) => {
      const cobrador = await escenario.crearUsuario(RolUsuario.COBRADOR);
      const localidad = await escenario.crearLocalidad();
      const cliente = await escenario.crearCliente(localidad.id, {
        saldo: 500,
      });
      await escenario.crearRuta(
        [localidad.id],
        [cliente.id],
        undefined,
        cobrador.id,
      );
      const respuesta = await request(app)
        .post("/api/v1/abonos")
        .set(cabeceras(cobrador.token))
        .send({ clienteId: cliente.id, monto: 501, metodo: "EFECTIVO" })
        .expect(422);
      expect(respuesta.body.error.codigo).toBe("ABONO_EXCEDENTE");
      expect(
        Number(
          (
            await prisma.saldoCliente.findUniqueOrThrow({
              where: { clienteId: cliente.id },
            })
          ).saldoActual,
        ),
      ).toBe(500);
      expect(
        await prisma.abono.count({ where: { clienteId: cliente.id } }),
      ).toBe(0);
    }));

  it("al liquidar elimina la tarjeta y marca todas las cuotas pagadas", () =>
    conEscenario(async (escenario) => {
      const [admin, cobrador] = await Promise.all([
        escenario.crearUsuario(RolUsuario.ADMINISTRADOR),
        escenario.crearUsuario(RolUsuario.COBRADOR),
      ]);
      const localidad = await escenario.crearLocalidad();
      const cliente = await escenario.crearCliente(localidad.id);
      await escenario.crearRuta(
        [localidad.id],
        [cliente.id],
        undefined,
        cobrador.id,
      );
      const producto = await escenario.crearProducto({
        existencia: 2,
        precio: 300,
      });
      const venta = await request(app)
        .post("/api/v1/ventas")
        .set(cabeceras(admin.token))
        .send({
          tipo: "CREDITO",
          clienteId: cliente.id,
          numeroTarjeta: `LIQ-${escenario.marca}`,
          items: [{ productoId: producto.id, cantidad: 1 }],
          plan: {
            periodicidad: "SEMANAL",
            montoCuota: 100,
            primerVencimiento: new Date(),
          },
        })
        .expect(201);
      await request(app)
        .post("/api/v1/abonos")
        .set(cabeceras(cobrador.token))
        .send({
          clienteId: cliente.id,
          ventaId: venta.body.id,
          monto: 300,
          metodo: "TRANSFERENCIA",
        })
        .expect(201);
      const [clienteFinal, cuotas] = await Promise.all([
        prisma.cliente.findUniqueOrThrow({
          where: { id: cliente.id },
          include: { saldo: true },
        }),
        prisma.cuota.findMany({
          where: { planPago: { ventaId: venta.body.id } },
        }),
      ]);
      expect(Number(clienteFinal.saldo?.saldoActual)).toBe(0);
      expect(clienteFinal.numeroTarjeta).toBeNull();
      expect(cuotas.every((cuota) => cuota.estado === "PAGADA")).toBe(true);
    }));

  it("no permite anular dos veces el mismo abono", () =>
    conEscenario(async (escenario) => {
      const [contable, cobrador] = await Promise.all([
        escenario.crearUsuario(RolUsuario.CONTABLE),
        escenario.crearUsuario(RolUsuario.COBRADOR),
      ]);
      const localidad = await escenario.crearLocalidad();
      const cliente = await escenario.crearCliente(localidad.id, {
        saldo: 500,
      });
      await escenario.crearRuta(
        [localidad.id],
        [cliente.id],
        undefined,
        cobrador.id,
      );
      const abono = await request(app)
        .post("/api/v1/abonos")
        .set(cabeceras(cobrador.token))
        .send({ clienteId: cliente.id, monto: 100, metodo: "EFECTIVO" })
        .expect(201);
      await request(app)
        .post(`/api/v1/abonos/${abono.body.id}/anular`)
        .set(cabeceras(contable.token))
        .send({ motivo: "Primera anulación autorizada por contabilidad" })
        .expect(200);
      const repetida = await request(app)
        .post(`/api/v1/abonos/${abono.body.id}/anular`)
        .set(cabeceras(contable.token))
        .send({ motivo: "Segundo intento que debe quedar bloqueado" })
        .expect(409);
      expect(repetida.body.error.codigo).toBe("ABONO_YA_ANULADO");
    }));

  it("serializa dos anulaciones concurrentes y revierte el saldo una sola vez", () =>
    conEscenario(async (escenario) => {
      const [admin, contable] = await Promise.all([
        escenario.crearUsuario(RolUsuario.ADMINISTRADOR),
        escenario.crearUsuario(RolUsuario.CONTABLE),
      ]);
      const localidad = await escenario.crearLocalidad();
      const cliente = await escenario.crearCliente(localidad.id, {
        saldo: 5_000,
      });
      const abonoIds: string[] = [];
      for (let intento = 1; intento <= 12; intento += 1) {
        const abono = await request(app)
          .post("/api/v1/abonos")
          .set(cabeceras(admin.token))
          .send({ clienteId: cliente.id, monto: 100, metodo: "EFECTIVO" })
          .expect(201);
        abonoIds.push(abono.body.id);
        const respuestas = await Promise.all([
          request(app)
            .post(`/api/v1/abonos/${abono.body.id}/anular`)
            .set(cabeceras(admin.token))
            .send({
              motivo: `Anulación concurrente ${intento} por administración`,
            }),
          request(app)
            .post(`/api/v1/abonos/${abono.body.id}/anular`)
            .set(cabeceras(contable.token))
            .send({
              motivo: `Anulación concurrente ${intento} por contabilidad`,
            }),
        ]);
        expect(respuestas.map(({ status }) => status).sort()).toEqual([
          200, 409,
        ]);
        expect(
          respuestas.find(({ status }) => status === 409)?.body.error.codigo,
        ).toBe("ABONO_YA_ANULADO");
      }

      const [saldo, reversas, auditorias] = await Promise.all([
        prisma.saldoCliente.findUniqueOrThrow({
          where: { clienteId: cliente.id },
        }),
        prisma.movimientoSaldo.count({
          where: {
            referenciaId: { in: abonoIds },
            tipo: "AJUSTE_CARGO",
          },
        }),
        prisma.auditoria.count({
          where: {
            entidad: "Abono",
            entidadId: { in: abonoIds },
            accion: "ANULAR",
          },
        }),
      ]);
      expect(Number(saldo.saldoActual)).toBe(5_000);
      expect(Number(saldo.totalAbonos)).toBe(0);
      expect(reversas).toBe(12);
      expect(auditorias).toBe(12);
    }));

  it("impide anular un abono incluido en un corte firmado", () =>
    conEscenario(async (escenario) => {
      const [admin, contable, cobrador] = await Promise.all([
        escenario.crearUsuario(RolUsuario.ADMINISTRADOR),
        escenario.crearUsuario(RolUsuario.CONTABLE),
        escenario.crearUsuario(RolUsuario.COBRADOR),
      ]);
      const localidad = await escenario.crearLocalidad();
      const cliente = await escenario.crearCliente(localidad.id, {
        saldo: 500,
      });
      await escenario.crearRuta(
        [localidad.id],
        [cliente.id],
        undefined,
        cobrador.id,
      );
      const abono = await request(app)
        .post("/api/v1/abonos")
        .set(cabeceras(cobrador.token))
        .send({ clienteId: cliente.id, monto: 100, metodo: "EFECTIVO" })
        .expect(201);
      const fecha = fechaMexicoISO(new Date());
      await request(app)
        .post("/api/v1/cortes")
        .set(cabeceras(admin.token))
        .send({
          usuarioOperadorId: cobrador.id,
          fecha,
          efectivo: 100,
          transferencia: 0,
          tarjeta: 0,
          otro: 0,
          firmaNombre: admin.nombre,
          confirmacion: `CERRAR ${fecha}`,
        })
        .expect(201);
      const bloqueada = await request(app)
        .post(`/api/v1/abonos/${abono.body.id}/anular`)
        .set(cabeceras(contable.token))
        .send({ motivo: "Intento posterior al cierre firmado del cobrador" })
        .expect(409);
      expect(bloqueada.body.error.codigo).toBe("CORTE_CERRADO");
    }));
});

describe.sequential("devoluciones y cambios adversariales", () => {
  it("serializa dos devoluciones concurrentes de la misma unidad", () =>
    conEscenario(async (escenario) => {
      const [admin, contable] = await Promise.all([
        escenario.crearUsuario(RolUsuario.ADMINISTRADOR),
        escenario.crearUsuario(RolUsuario.CONTABLE),
      ]);
      const producto = await escenario.crearProducto({
        existencia: 20,
        precio: 100,
      });
      const ventaIds: string[] = [];
      for (let intento = 1; intento <= 12; intento += 1) {
        const venta = await request(app)
          .post("/api/v1/ventas")
          .set(cabeceras(admin.token))
          .send({
            tipo: "PUBLICO",
            items: [{ productoId: producto.id, cantidad: 1 }],
          })
          .expect(201);
        ventaIds.push(venta.body.id);
        const datos = {
          ventaId: venta.body.id,
          tipo: "TOTAL",
          motivo: `Devolución concurrente ${intento} de la misma unidad`,
          montoReembolsado: 100,
          metodoReembolso: "EFECTIVO",
          usuarioOperadorId: admin.id,
          evidencia: evidenciaValida,
          items: [{ detalleVentaId: venta.body.detalles[0].id, cantidad: 1 }],
        };
        const respuestas = await Promise.all([
          request(app)
            .post("/api/v1/devoluciones")
            .set(cabeceras(admin.token))
            .send(datos),
          request(app)
            .post("/api/v1/devoluciones")
            .set(cabeceras(contable.token))
            .send(datos),
        ]);
        expect(respuestas.map(({ status }) => status).sort()).toEqual([
          201, 422,
        ]);
      }

      const [devoluciones, entradas, productoFinal] = await Promise.all([
        prisma.devolucion.count({ where: { ventaId: { in: ventaIds } } }),
        prisma.movimientoInventario.count({
          where: {
            productoId: producto.id,
            tipo: "ENTRADA_DEVOLUCION",
          },
        }),
        prisma.producto.findUniqueOrThrow({ where: { id: producto.id } }),
      ]);
      expect(devoluciones).toBe(12);
      expect(entradas).toBe(12);
      expect(productoFinal.existencia).toBe(20);
    }));

  it("carga el reembolso autorizado por Contabilidad a la caja que lo entrega", () =>
    conEscenario(async (escenario) => {
      const [admin, contable] = await Promise.all([
        escenario.crearUsuario(RolUsuario.ADMINISTRADOR),
        escenario.crearUsuario(RolUsuario.CONTABLE),
      ]);
      const producto = await escenario.crearProducto({
        existencia: 3,
        precio: 100,
      });
      const ventas = [];
      for (let indice = 0; indice < 2; indice += 1) {
        ventas.push(
          (
            await request(app)
              .post("/api/v1/ventas")
              .set(cabeceras(admin.token))
              .send({
                tipo: "PUBLICO",
                metodoAnticipo: "EFECTIVO",
                items: [{ productoId: producto.id, cantidad: 1 }],
              })
              .expect(201)
          ).body,
        );
      }

      const operadorSinCaja = await request(app)
        .post("/api/v1/devoluciones")
        .set(cabeceras(contable.token))
        .send({
          ventaId: ventas[0].id,
          tipo: "TOTAL",
          motivo: "Contabilidad no puede atribuirse una salida de caja",
          montoReembolsado: 100,
          metodoReembolso: "EFECTIVO",
          usuarioOperadorId: contable.id,
          evidencia: evidenciaValida,
          items: [{ detalleVentaId: ventas[0].detalles[0].id, cantidad: 1 }],
        })
        .expect(422);
      expect(operadorSinCaja.body.error.codigo).toBe(
        "OPERADOR_REEMBOLSO_INVALIDO",
      );

      const devolucion = await request(app)
        .post("/api/v1/devoluciones")
        .set(cabeceras(contable.token))
        .send({
          ventaId: ventas[0].id,
          tipo: "TOTAL",
          motivo: "Contabilidad autoriza y la caja del administrador reembolsa",
          montoReembolsado: 100,
          metodoReembolso: "EFECTIVO",
          usuarioOperadorId: admin.id,
          evidencia: evidenciaValida,
          items: [{ detalleVentaId: ventas[0].detalles[0].id, cantidad: 1 }],
        })
        .expect(201);
      expect(devolucion.body.autorizadoPorId).toBe(contable.id);
      expect(devolucion.body.usuarioOperadorId).toBe(admin.id);

      const fecha = fechaMexicoISO(new Date());
      const previsualizacion = await request(app)
        .get(
          `/api/v1/cortes/previsualizar?usuarioOperadorId=${admin.id}&fecha=${fecha}`,
        )
        .set(cabeceras(admin.token))
        .expect(200);
      expect(previsualizacion.body.reembolsos).toEqual({
        cantidad: 1,
        total: 100,
      });
      expect(previsualizacion.body.sistema.efectivo).toBe(100);

      await request(app)
        .post("/api/v1/cortes")
        .set(cabeceras(admin.token))
        .send({
          usuarioOperadorId: admin.id,
          fecha,
          efectivo: 100,
          transferencia: 0,
          tarjeta: 0,
          otro: 0,
          firmaNombre: admin.nombre,
          confirmacion: `CERRAR ${fecha}`,
        })
        .expect(201);

      const tardia = await request(app)
        .post("/api/v1/devoluciones")
        .set(cabeceras(contable.token))
        .send({
          ventaId: ventas[1].id,
          tipo: "TOTAL",
          motivo: "Reembolso que intenta salir después del cierre firmado",
          montoReembolsado: 100,
          metodoReembolso: "EFECTIVO",
          usuarioOperadorId: admin.id,
          evidencia: evidenciaValida,
          items: [{ detalleVentaId: ventas[1].detalles[0].id, cantidad: 1 }],
        })
        .expect(409);
      expect(tardia.body.error.codigo).toBe("JORNADA_CERRADA");
      expect(
        await prisma.devolucion.count({
          where: { ventaId: { in: ventas.map((venta) => venta.id) } },
        }),
      ).toBe(1);
    }));

  it("serializa el reembolso con el cierre y nunca lo deja fuera de ambos cortes", () =>
    conEscenario(async (escenario) => {
      const [admin, contable] = await Promise.all([
        escenario.crearUsuario(RolUsuario.ADMINISTRADOR),
        escenario.crearUsuario(RolUsuario.CONTABLE),
      ]);
      const producto = await escenario.crearProducto({
        existencia: 1,
        precio: 100,
      });
      const venta = (
        await request(app)
          .post("/api/v1/ventas")
          .set(cabeceras(admin.token))
          .send({
            tipo: "PUBLICO",
            metodoAnticipo: "EFECTIVO",
            items: [{ productoId: producto.id, cantidad: 1 }],
          })
          .expect(201)
      ).body;
      const fecha = fechaMexicoISO(new Date());

      const [respuestaDevolucion, respuestaCorte] = await Promise.all([
        request(app)
          .post("/api/v1/devoluciones")
          .set(cabeceras(contable.token))
          .send({
            ventaId: venta.id,
            tipo: "TOTAL",
            motivo: "Reembolso concurrente con el cierre diario de la caja",
            montoReembolsado: 100,
            metodoReembolso: "EFECTIVO",
            usuarioOperadorId: admin.id,
            evidencia: evidenciaValida,
            items: [{ detalleVentaId: venta.detalles[0].id, cantidad: 1 }],
          }),
        request(app)
          .post("/api/v1/cortes")
          .set(cabeceras(admin.token))
          .send({
            usuarioOperadorId: admin.id,
            fecha,
            efectivo: 0,
            transferencia: 0,
            tarjeta: 0,
            otro: 0,
            firmaNombre: admin.nombre,
            confirmacion: `CERRAR ${fecha}`,
          }),
      ]);

      expect(respuestaCorte.status).toBe(201);
      expect([201, 409]).toContain(respuestaDevolucion.status);
      const corte = await prisma.corteCaja.findUniqueOrThrow({
        where: {
          usuarioOperadorId_fechaOperativa: {
            usuarioOperadorId: admin.id,
            fechaOperativa: new Date(`${fecha}T00:00:00.000Z`),
          },
        },
      });
      if (respuestaDevolucion.status === 201) {
        expect(corte.cantidadReembolsos).toBe(1);
        expect(Number(corte.totalReembolsos)).toBe(100);
        expect(Number(corte.efectivoSistema)).toBe(0);
      } else {
        expect(respuestaDevolucion.body.error.codigo).toBe("JORNADA_CERRADA");
        expect(corte.cantidadReembolsos).toBe(0);
        expect(Number(corte.totalReembolsos)).toBe(0);
        expect(Number(corte.efectivoSistema)).toBe(100);
      }
    }));

  it("serializa reembolso y abono del mismo operador y cliente sin deadlock", () =>
    conEscenario(async (escenario) => {
      const [admin, contable] = await Promise.all([
        escenario.crearUsuario(RolUsuario.ADMINISTRADOR),
        escenario.crearUsuario(RolUsuario.CONTABLE),
      ]);
      const localidad = await escenario.crearLocalidad();
      const producto = await escenario.crearProducto({
        existencia: 12,
        precio: 200,
      });

      for (let intento = 1; intento <= 12; intento += 1) {
        const cliente = await escenario.crearCliente(localidad.id, {
          indice: intento,
        });
        const venta = (
          await request(app)
            .post("/api/v1/ventas")
            .set(cabeceras(admin.token))
            .send({
              tipo: "CREDITO",
              clienteId: cliente.id,
              numeroTarjeta: `DEADLOCK-${intento}-${escenario.marca}`,
              items: [{ productoId: producto.id, cantidad: 1 }],
              plan: {
                periodicidad: "SEMANAL",
                montoCuota: 100,
                primerVencimiento: new Date(),
              },
            })
            .expect(201)
        ).body;
        await request(app)
          .post("/api/v1/abonos")
          .set(cabeceras(admin.token))
          .send({ clienteId: cliente.id, monto: 100, metodo: "EFECTIVO" })
          .expect(201);

        const [respuestaReembolso, respuestaAbono] = await Promise.all([
          request(app)
            .post("/api/v1/devoluciones")
            .set(cabeceras(contable.token))
            .send({
              ventaId: venta.id,
              tipo: "TOTAL",
              motivo: `Carrera controlada reembolso contra abono ${intento}`,
              montoReembolsado: 100,
              metodoReembolso: "EFECTIVO",
              usuarioOperadorId: admin.id,
              evidencia: evidenciaValida,
              items: [{ detalleVentaId: venta.detalles[0].id, cantidad: 1 }],
            }),
          request(app)
            .post("/api/v1/abonos")
            .set(cabeceras(admin.token))
            .send({ clienteId: cliente.id, monto: 50, metodo: "EFECTIVO" }),
        ]);

        expect(respuestaReembolso.status).not.toBe(500);
        expect(respuestaAbono.status).not.toBe(500);
        expect(
          [respuestaReembolso.status, respuestaAbono.status].sort(),
        ).toEqual([201, 422]);

        const [saldo, ventaFinal, cantidadAbonos] = await Promise.all([
          prisma.saldoCliente.findUniqueOrThrow({
            where: { clienteId: cliente.id },
          }),
          prisma.venta.findUniqueOrThrow({ where: { id: venta.id } }),
          prisma.abono.count({
            where: { clienteId: cliente.id, anuladoEn: null },
          }),
        ]);
        if (respuestaReembolso.status === 201) {
          expect(respuestaAbono.body.error.codigo).toBe("ABONO_EXCEDENTE");
          expect(Number(saldo.saldoActual)).toBe(0);
          expect(ventaFinal.estado).toBe("CANCELADA");
          expect(cantidadAbonos).toBe(1);
        } else {
          expect(respuestaReembolso.body.error.codigo).toBe(
            "REEMBOLSO_INCONSISTENTE",
          );
          expect(Number(saldo.saldoActual)).toBe(50);
          expect(ventaFinal.estado).toBe("CONFIRMADA");
          expect(cantidadAbonos).toBe(2);
        }
      }
    }));

  it("una devolución parcial reduce saldo, repone stock y conserva la venta", () =>
    conEscenario(async (escenario) => {
      const admin = await escenario.crearUsuario(RolUsuario.ADMINISTRADOR);
      const localidad = await escenario.crearLocalidad();
      const cliente = await escenario.crearCliente(localidad.id);
      const producto = await escenario.crearProducto({
        existencia: 5,
        precio: 100,
      });
      const venta = await request(app)
        .post("/api/v1/ventas")
        .set(cabeceras(admin.token))
        .send({
          tipo: "CREDITO",
          clienteId: cliente.id,
          numeroTarjeta: `DEV-${escenario.marca}`,
          items: [{ productoId: producto.id, cantidad: 2 }],
          plan: {
            periodicidad: "SEMANAL",
            montoCuota: 100,
            primerVencimiento: new Date(),
          },
        })
        .expect(201);
      const devolucion = await request(app)
        .post("/api/v1/devoluciones")
        .set(cabeceras(admin.token))
        .send({
          ventaId: venta.body.id,
          tipo: "PARCIAL",
          motivo: "Una unidad llegó con defecto de fabricación visible",
          montoReembolsado: 0,
          evidencia: evidenciaValida,
          items: [{ detalleVentaId: venta.body.detalles[0].id, cantidad: 1 }],
        })
        .expect(201);
      expect(Number(devolucion.body.aplicadoSaldo)).toBe(100);
      const [ventaFinal, saldo, productoFinal] = await Promise.all([
        prisma.venta.findUniqueOrThrow({ where: { id: venta.body.id } }),
        prisma.saldoCliente.findUniqueOrThrow({
          where: { clienteId: cliente.id },
        }),
        prisma.producto.findUniqueOrThrow({ where: { id: producto.id } }),
      ]);
      expect(ventaFinal.estado).toBe("CONFIRMADA");
      expect(Number(saldo.saldoActual)).toBe(100);
      expect(productoFinal.existencia).toBe(4);
    }));

  it("rechaza evidencia falsa aunque declare MIME de imagen", () =>
    conEscenario(async (escenario) => {
      const admin = await escenario.crearUsuario(RolUsuario.ADMINISTRADOR);
      const producto = await escenario.crearProducto({
        existencia: 2,
        precio: 100,
      });
      const venta = await request(app)
        .post("/api/v1/ventas")
        .set(cabeceras(admin.token))
        .send({
          tipo: "PUBLICO",
          items: [{ productoId: producto.id, cantidad: 1 }],
        })
        .expect(201);
      const respuesta = await request(app)
        .post("/api/v1/devoluciones")
        .set(cabeceras(admin.token))
        .send({
          ventaId: venta.body.id,
          tipo: "TOTAL",
          motivo: "Archivo falso que no debe aceptarse como fotografía",
          montoReembolsado: 100,
          metodoReembolso: "EFECTIVO",
          usuarioOperadorId: admin.id,
          evidencia: {
            nombre: "falsa.png",
            mime: "image/png",
            base64: Buffer.from("esto no es una imagen real").toString(
              "base64",
            ),
          },
          items: [{ detalleVentaId: venta.body.detalles[0].id, cantidad: 1 }],
        })
        .expect(422);
      expect(respuesta.body.error.codigo).toBe("EVIDENCIA_INVALIDA");
      expect(
        (
          await prisma.producto.findUniqueOrThrow({
            where: { id: producto.id },
          })
        ).existencia,
      ).toBe(1);
    }));

  it("rechaza devolver más unidades que las vendidas", () =>
    conEscenario(async (escenario) => {
      const admin = await escenario.crearUsuario(RolUsuario.ADMINISTRADOR);
      const producto = await escenario.crearProducto({
        existencia: 2,
        precio: 100,
      });
      const venta = await request(app)
        .post("/api/v1/ventas")
        .set(cabeceras(admin.token))
        .send({
          tipo: "PUBLICO",
          items: [{ productoId: producto.id, cantidad: 1 }],
        })
        .expect(201);
      const respuesta = await request(app)
        .post("/api/v1/devoluciones")
        .set(cabeceras(admin.token))
        .send({
          ventaId: venta.body.id,
          tipo: "PARCIAL",
          motivo: "Intento de devolución con cantidad superior a la venta",
          montoReembolsado: 200,
          metodoReembolso: "EFECTIVO",
          usuarioOperadorId: admin.id,
          evidencia: evidenciaValida,
          items: [{ detalleVentaId: venta.body.detalles[0].id, cantidad: 2 }],
        })
        .expect(422);
      expect(respuesta.body.error.codigo).toBe("CANTIDAD_EXCEDENTE");
    }));

  it("rechaza cancelación total si no incluye toda la mercancía", () =>
    conEscenario(async (escenario) => {
      const admin = await escenario.crearUsuario(RolUsuario.ADMINISTRADOR);
      const producto = await escenario.crearProducto({
        existencia: 3,
        precio: 100,
      });
      const venta = await request(app)
        .post("/api/v1/ventas")
        .set(cabeceras(admin.token))
        .send({
          tipo: "PUBLICO",
          items: [{ productoId: producto.id, cantidad: 2 }],
        })
        .expect(201);
      const respuesta = await request(app)
        .post("/api/v1/devoluciones")
        .set(cabeceras(admin.token))
        .send({
          ventaId: venta.body.id,
          tipo: "TOTAL",
          motivo: "Cancelación incompleta que debe ser rechazada",
          montoReembolsado: 100,
          metodoReembolso: "EFECTIVO",
          usuarioOperadorId: admin.id,
          evidencia: evidenciaValida,
          items: [{ detalleVentaId: venta.body.detalles[0].id, cantidad: 1 }],
        })
        .expect(422);
      expect(respuesta.body.error.codigo).toBe("DEVOLUCION_TOTAL_INCOMPLETA");
    }));

  it("un cambio crea pedido de reemplazo sin descontar aún el nuevo producto", () =>
    conEscenario(async (escenario) => {
      const admin = await escenario.crearUsuario(RolUsuario.ADMINISTRADOR);
      const localidad = await escenario.crearLocalidad();
      const cliente = await escenario.crearCliente(localidad.id);
      const [original, reemplazo] = await Promise.all([
        escenario.crearProducto({ indice: 1, existencia: 2, precio: 100 }),
        escenario.crearProducto({ indice: 2, existencia: 4, precio: 120 }),
      ]);
      const venta = await request(app)
        .post("/api/v1/ventas")
        .set(cabeceras(admin.token))
        .send({
          tipo: "CREDITO",
          clienteId: cliente.id,
          numeroTarjeta: `CAM-${escenario.marca}`,
          items: [{ productoId: original.id, cantidad: 1 }],
          plan: {
            periodicidad: "SEMANAL",
            montoCuota: 100,
            primerVencimiento: new Date(),
          },
        })
        .expect(201);
      const cambio = await request(app)
        .post("/api/v1/devoluciones")
        .set(cabeceras(admin.token))
        .send({
          ventaId: venta.body.id,
          tipo: "CAMBIO",
          motivo: "La clienta solicitó cambiar el modelo completo",
          montoReembolsado: 0,
          evidencia: evidenciaValida,
          items: [{ detalleVentaId: venta.body.detalles[0].id, cantidad: 1 }],
          reemplazos: [{ productoId: reemplazo.id, cantidad: 1 }],
        })
        .expect(201);
      const pedido = await prisma.pedidoVenta.findUniqueOrThrow({
        where: { id: cambio.body.pedidoId },
        include: { items: true },
      });
      expect(pedido.estado).toBe("PENDIENTE_PEDIR");
      expect(pedido.items[0]?.productoId).toBe(reemplazo.id);
      expect(
        (
          await prisma.producto.findUniqueOrThrow({
            where: { id: reemplazo.id },
          })
        ).existencia,
      ).toBe(4);
    }));
});

describe.sequential("compras, proveedores y cortes adversariales", () => {
  it("revierte una compra si el artículo pendiente pertenece a otro producto", () =>
    conEscenario(async (escenario) => {
      const admin = await escenario.crearUsuario(RolUsuario.ADMINISTRADOR);
      const localidad = await escenario.crearLocalidad();
      const cliente = await escenario.crearCliente(localidad.id);
      const [productoPedido, productoCompra] = await Promise.all([
        escenario.crearProducto({ indice: 1, existencia: 0 }),
        escenario.crearProducto({ indice: 2, existencia: 0 }),
      ]);
      const proveedor = await escenario.crearProveedor();
      const pedido = await request(app)
        .post("/api/v1/pedidos")
        .set(cabeceras(admin.token))
        .send({
          clienteId: cliente.id,
          items: [{ productoId: productoPedido.id, cantidad: 1 }],
        })
        .expect(201);
      await request(app)
        .patch(`/api/v1/pedidos/${pedido.body.id}/estado`)
        .set(cabeceras(admin.token))
        .send({ estado: "PEDIDO_PROVEEDOR" })
        .expect(200);
      const respuesta = await request(app)
        .post("/api/v1/compras")
        .set(cabeceras(admin.token))
        .send({
          proveedorId: proveedor.id,
          items: [
            {
              productoId: productoCompra.id,
              cantidad: 2,
              costoUnitario: 50,
              itemPedidoId: pedido.body.items[0].id,
            },
          ],
        })
        .expect(422);
      expect(respuesta.body.error.codigo).toBe("PEDIDO_INVALIDO");
      expect(
        (
          await prisma.producto.findUniqueOrThrow({
            where: { id: productoCompra.id },
          })
        ).existencia,
      ).toBe(0);
      expect(
        await prisma.compra.count({ where: { usuarioId: admin.id } }),
      ).toBe(0);
    }));

  it("rechaza compras de un proveedor inactivo", () =>
    conEscenario(async (escenario) => {
      const admin = await escenario.crearUsuario(RolUsuario.ADMINISTRADOR);
      const producto = await escenario.crearProducto({ existencia: 0 });
      const proveedor = await escenario.crearProveedor();
      await prisma.proveedor.update({
        where: { id: proveedor.id },
        data: { activo: false },
      });
      const respuesta = await request(app)
        .post("/api/v1/compras")
        .set(cabeceras(admin.token))
        .send({
          proveedorId: proveedor.id,
          items: [{ productoId: producto.id, cantidad: 1, costoUnitario: 50 }],
        })
        .expect(422);
      expect(respuesta.body.error.codigo).toBe("PROVEEDOR_INVALIDO");
    }));

  it("calcula y conserva una diferencia de caja", () =>
    conEscenario(async (escenario) => {
      const admin = await escenario.crearUsuario(RolUsuario.ADMINISTRADOR);
      const producto = await escenario.crearProducto({
        existencia: 2,
        precio: 100,
      });
      await request(app)
        .post("/api/v1/ventas")
        .set(cabeceras(admin.token))
        .send({
          tipo: "PUBLICO",
          metodoAnticipo: "EFECTIVO",
          items: [{ productoId: producto.id, cantidad: 1 }],
        })
        .expect(201);
      const fecha = fechaMexicoISO(new Date());
      const corte = await request(app)
        .post("/api/v1/cortes")
        .set(cabeceras(admin.token))
        .send({
          usuarioOperadorId: admin.id,
          fecha,
          efectivo: 80,
          transferencia: 0,
          tarjeta: 0,
          otro: 0,
          firmaNombre: admin.nombre,
          confirmacion: `CERRAR ${fecha}`,
          notas: "Faltante de caja detectado por automatización",
        })
        .expect(201);
      expect(Number(corte.body.efectivoSistema)).toBe(100);
      expect(Number(corte.body.diferencia)).toBe(-20);
      expect(corte.body.hashIntegridad).toMatch(/^[a-f0-9]{64}$/);
    }));

  it("el cobrador no puede consultar ni cerrar la jornada de otro", () =>
    conEscenario(async (escenario) => {
      const [cobradorUno, cobradorDos] = await Promise.all([
        escenario.crearUsuario(RolUsuario.COBRADOR),
        escenario.crearUsuario(RolUsuario.COBRADOR),
      ]);
      const fecha = fechaMexicoISO(new Date());
      const consulta = await request(app)
        .get(
          `/api/v1/cortes/previsualizar?usuarioOperadorId=${cobradorDos.id}&fecha=${fecha}`,
        )
        .set(cabeceras(cobradorUno.token))
        .expect(403);
      expect(consulta.body.error.codigo).toBe("OPERADOR_PROHIBIDO");
      await request(app)
        .post("/api/v1/cortes")
        .set(cabeceras(cobradorUno.token))
        .send({
          usuarioOperadorId: cobradorDos.id,
          fecha,
          efectivo: 0,
          transferencia: 0,
          tarjeta: 0,
          otro: 0,
          firmaNombre: cobradorUno.nombre,
          confirmacion: `CERRAR ${fecha}`,
        })
        .expect(403);
    }));

  it("serializa un abono concurrente con el corte y nunca lo deja fuera", () =>
    conEscenario(async (escenario) => {
      const [admin, cobrador] = await Promise.all([
        escenario.crearUsuario(RolUsuario.ADMINISTRADOR),
        escenario.crearUsuario(RolUsuario.COBRADOR),
      ]);
      const localidad = await escenario.crearLocalidad();
      const cliente = await escenario.crearCliente(localidad.id, {
        saldo: 500,
      });
      await escenario.crearRuta(
        [localidad.id],
        [cliente.id],
        undefined,
        cobrador.id,
      );
      const fecha = fechaMexicoISO(new Date());
      const [respuestaAbono, respuestaCorte] = await Promise.all([
        request(app)
          .post("/api/v1/abonos")
          .set(cabeceras(cobrador.token))
          .send({ clienteId: cliente.id, monto: 100, metodo: "EFECTIVO" }),
        request(app)
          .post("/api/v1/cortes")
          .set(cabeceras(admin.token))
          .send({
            usuarioOperadorId: cobrador.id,
            fecha,
            efectivo: 0,
            transferencia: 0,
            tarjeta: 0,
            otro: 0,
            firmaNombre: admin.nombre,
            confirmacion: `CERRAR ${fecha}`,
          }),
      ]);
      expect(respuestaCorte.status).toBe(201);
      expect([201, 409]).toContain(respuestaAbono.status);
      const corte = await prisma.corteCaja.findFirstOrThrow({
        where: { usuarioOperadorId: cobrador.id },
      });
      if (respuestaAbono.status === 201) {
        expect(corte.cantidadAbonos).toBe(1);
        expect(Number(corte.efectivoSistema)).toBe(100);
      } else {
        expect(respuestaAbono.body.error.codigo).toBe("JORNADA_CERRADA");
        expect(corte.cantidadAbonos).toBe(0);
      }
    }));
});
