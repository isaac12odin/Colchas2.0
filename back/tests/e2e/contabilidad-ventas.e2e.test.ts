import { randomUUID } from "node:crypto";

import { RolUsuario } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { app } from "../../src/app.js";
import { prisma } from "../../src/infraestructura/prisma.js";
import {
  asegurarBaseDePruebas,
  cabeceras,
  EscenarioPrueba,
} from "./escenario.js";

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

function plan(montoCuota = 200) {
  return {
    periodicidad: "SEMANAL",
    montoCuota,
    primerVencimiento: new Date(Date.now() + 7 * 86_400_000),
  };
}

describe.sequential("contabilidad autoritativa de ventas", () => {
  it("suma total menos anticipo al saldo y lo refleja en expediente", () =>
    conEscenario(async (escenario) => {
      const admin = await escenario.crearUsuario(RolUsuario.ADMINISTRADOR);
      const localidad = await escenario.crearLocalidad();
      const cliente = await escenario.crearCliente(localidad.id, {
        saldo: 250,
      });
      const producto = await escenario.crearProducto({
        existencia: 10,
        precio: 333.33,
      });

      const respuesta = await request(app)
        .post("/api/v1/ventas")
        .set(cabeceras(admin.token))
        .send({
          idOperacionMovil: `web-${randomUUID()}`,
          clienteId: cliente.id,
          numeroTarjeta: `T-${escenario.marca}`,
          tipo: "CREDITO",
          anticipo: 100.01,
          metodoAnticipo: "TRANSFERENCIA",
          items: [{ productoId: producto.id, cantidad: 2 }],
          plan: plan(),
        })
        .expect(201);

      expect(Number(respuesta.body.total)).toBe(666.66);
      expect(respuesta.body.resumenSaldo).toMatchObject({
        saldoAnterior: 250,
        cargoVenta: 666.66,
        anticipo: 100.01,
        saldoNuevo: 816.65,
      });

      const expediente = await request(app)
        .get(`/api/v1/clientes/${cliente.id}`)
        .set(cabeceras(admin.token))
        .expect(200);
      expect(Number(expediente.body.saldo.saldoActual)).toBe(816.65);
      expect(expediente.headers["cache-control"]).toContain("no-store");

      const [saldo, movimientos, abonos, productoFinal] = await Promise.all([
        prisma.saldoCliente.findUniqueOrThrow({
          where: { clienteId: cliente.id },
        }),
        prisma.movimientoSaldo.findMany({
          where: { clienteId: cliente.id },
          orderBy: { creadoEn: "asc" },
        }),
        prisma.abono.findMany({ where: { clienteId: cliente.id } }),
        prisma.producto.findUniqueOrThrow({ where: { id: producto.id } }),
      ]);
      expect(Number(saldo.saldoActual)).toBe(816.65);
      expect(Number(saldo.totalCargos)).toBe(916.66);
      expect(Number(saldo.totalAbonos)).toBe(100.01);
      expect(movimientos.map((item) => item.tipo)).toEqual([
        "CARGO_VENTA",
        "ABONO",
      ]);
      const [cargoVenta, abonoInicial] = movimientos;
      expect(cargoVenta).toBeDefined();
      expect(abonoInicial).toBeDefined();
      expect(Number(cargoVenta!.saldoNuevo)).toBe(916.66);
      expect(Number(abonoInicial!.saldoNuevo)).toBe(816.65);
      expect(abonos).toHaveLength(1);
      expect(productoFinal.existencia).toBe(8);
    }));

  it("reintenta una venta web sin duplicar deuda, stock ni abono", () =>
    conEscenario(async (escenario) => {
      const admin = await escenario.crearUsuario(RolUsuario.ADMINISTRADOR);
      const localidad = await escenario.crearLocalidad();
      const cliente = await escenario.crearCliente(localidad.id);
      const producto = await escenario.crearProducto({
        existencia: 5,
        precio: 300,
      });
      const cuerpo = {
        idOperacionMovil: `web-${randomUUID()}`,
        fechaVenta: new Date(),
        clienteId: cliente.id,
        numeroTarjeta: `T-${escenario.marca}`,
        tipo: "CREDITO",
        anticipo: 120,
        items: [{ productoId: producto.id, cantidad: 1 }],
        plan: plan(60),
      };

      const primera = await request(app)
        .post("/api/v1/ventas")
        .set(cabeceras(admin.token))
        .send(cuerpo)
        .expect(201);
      const repetida = await request(app)
        .post("/api/v1/ventas")
        .set(cabeceras(admin.token))
        .send(cuerpo)
        .expect(201);

      expect(primera.body.idempotente).toBe(false);
      expect(repetida.body.id).toBe(primera.body.id);
      expect(repetida.body.idempotente).toBe(true);
      expect(repetida.body.resumenSaldo).toMatchObject({
        saldoAnterior: 0,
        cargoVenta: 300,
        anticipo: 120,
        saldoNuevo: 180,
      });
      const [saldo, ventas, movimientos, abonos, productoFinal] =
        await Promise.all([
          prisma.saldoCliente.findUniqueOrThrow({
            where: { clienteId: cliente.id },
          }),
          prisma.venta.count({ where: { clienteId: cliente.id } }),
          prisma.movimientoSaldo.count({ where: { clienteId: cliente.id } }),
          prisma.abono.count({ where: { clienteId: cliente.id } }),
          prisma.producto.findUniqueOrThrow({ where: { id: producto.id } }),
        ]);
      expect(Number(saldo.saldoActual)).toBe(180);
      expect(ventas).toBe(1);
      expect(movimientos).toBe(2);
      expect(abonos).toBe(1);
      expect(productoFinal.existencia).toBe(4);
    }));

  it("contado con cliente y público general nunca alteran saldo", () =>
    conEscenario(async (escenario) => {
      const admin = await escenario.crearUsuario(RolUsuario.ADMINISTRADOR);
      const localidad = await escenario.crearLocalidad();
      const cliente = await escenario.crearCliente(localidad.id, {
        saldo: 500,
      });
      const producto = await escenario.crearProducto({
        existencia: 5,
        precio: 125,
      });

      await request(app)
        .post("/api/v1/ventas")
        .set(cabeceras(admin.token))
        .send({
          clienteId: cliente.id,
          tipo: "CONTADO",
          metodoAnticipo: "EFECTIVO",
          items: [{ productoId: producto.id, cantidad: 1 }],
        })
        .expect(201);
      await request(app)
        .post("/api/v1/ventas")
        .set(cabeceras(admin.token))
        .send({
          tipo: "PUBLICO",
          metodoAnticipo: "TARJETA",
          items: [{ productoId: producto.id, cantidad: 1 }],
        })
        .expect(201);

      const [saldo, movimientos] = await Promise.all([
        prisma.saldoCliente.findUniqueOrThrow({
          where: { clienteId: cliente.id },
        }),
        prisma.movimientoSaldo.count({ where: { clienteId: cliente.id } }),
      ]);
      expect(Number(saldo.saldoActual)).toBe(500);
      expect(movimientos).toBe(0);
    }));

  it("rechaza combinaciones ambiguas antes de tocar dinero o inventario", () =>
    conEscenario(async (escenario) => {
      const admin = await escenario.crearUsuario(RolUsuario.ADMINISTRADOR);
      const localidad = await escenario.crearLocalidad();
      const cliente = await escenario.crearCliente(localidad.id);
      const producto = await escenario.crearProducto({
        existencia: 3,
        precio: 100,
      });

      const anticipoContado = await request(app)
        .post("/api/v1/ventas")
        .set(cabeceras(admin.token))
        .send({
          clienteId: cliente.id,
          tipo: "CONTADO",
          anticipo: 10,
          items: [{ productoId: producto.id, cantidad: 1 }],
        })
        .expect(422);
      expect(anticipoContado.body.error.codigo).toBe("ANTICIPO_NO_PERMITIDO");

      const publicoConCliente = await request(app)
        .post("/api/v1/ventas")
        .set(cabeceras(admin.token))
        .send({
          clienteId: cliente.id,
          tipo: "PUBLICO",
          items: [{ productoId: producto.id, cantidad: 1 }],
        })
        .expect(422);
      expect(publicoConCliente.body.error.codigo).toBe("CLIENTE_NO_PERMITIDO");

      expect(
        (
          await prisma.producto.findUniqueOrThrow({
            where: { id: producto.id },
          })
        ).existencia,
      ).toBe(3);
      expect(await prisma.venta.count({ where: { usuarioId: admin.id } })).toBe(
        0,
      );
    }));

  it("serializa dos créditos simultáneos y conserva la suma exacta", () =>
    conEscenario(async (escenario) => {
      const admin = await escenario.crearUsuario(RolUsuario.ADMINISTRADOR);
      const localidad = await escenario.crearLocalidad();
      const cliente = await escenario.crearCliente(localidad.id, {
        tarjeta: `T-${escenario.marca}`,
      });
      const producto = await escenario.crearProducto({
        existencia: 5,
        precio: 100,
      });
      const vender = (idOperacionMovil: string) =>
        request(app)
          .post("/api/v1/ventas")
          .set(cabeceras(admin.token))
          .send({
            idOperacionMovil,
            clienteId: cliente.id,
            tipo: "CREDITO",
            items: [{ productoId: producto.id, cantidad: 1 }],
            plan: plan(50),
          });

      const respuestas = await Promise.all([
        vender(`web-${randomUUID()}`),
        vender(`web-${randomUUID()}`),
      ]);
      expect(respuestas.map((respuesta) => respuesta.status).sort()).toEqual([
        201, 201,
      ]);

      const [saldo, movimientos, productoFinal] = await Promise.all([
        prisma.saldoCliente.findUniqueOrThrow({
          where: { clienteId: cliente.id },
        }),
        prisma.movimientoSaldo.findMany({
          where: { clienteId: cliente.id, tipo: "CARGO_VENTA" },
        }),
        prisma.producto.findUniqueOrThrow({ where: { id: producto.id } }),
      ]);
      expect(Number(saldo.saldoActual)).toBe(200);
      expect(movimientos).toHaveLength(2);
      expect(productoFinal.existencia).toBe(3);
    }));

  it("no permite reutilizar una clave idempotente para otra venta o usuario", () =>
    conEscenario(async (escenario) => {
      const [adminA, adminB] = await Promise.all([
        escenario.crearUsuario(RolUsuario.ADMINISTRADOR),
        escenario.crearUsuario(RolUsuario.ADMINISTRADOR),
      ]);
      const producto = await escenario.crearProducto({
        existencia: 4,
        precio: 100,
      });
      const clave = `web-${randomUUID()}`;
      const cuerpo = {
        idOperacionMovil: clave,
        fechaVenta: new Date(),
        tipo: "PUBLICO",
        items: [{ productoId: producto.id, cantidad: 1 }],
      };
      await request(app)
        .post("/api/v1/ventas")
        .set(cabeceras(adminA.token))
        .send(cuerpo)
        .expect(201);
      const ajena = await request(app)
        .post("/api/v1/ventas")
        .set(cabeceras(adminB.token))
        .send(cuerpo)
        .expect(409);
      expect(ajena.body.error.codigo).toBe("ID_OPERACION_REUTILIZADO");

      const alterada = await request(app)
        .post("/api/v1/ventas")
        .set(cabeceras(adminA.token))
        .send({ ...cuerpo, items: [{ productoId: producto.id, cantidad: 2 }] })
        .expect(409);
      expect(alterada.body.error.codigo).toBe("ID_OPERACION_REUTILIZADO");
      expect(
        await prisma.venta.count({ where: { idOperacionMovil: clave } }),
      ).toBe(1);
    }));
});
