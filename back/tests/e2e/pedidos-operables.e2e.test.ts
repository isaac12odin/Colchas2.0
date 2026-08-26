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

describe.sequential("pedidos accionables", () => {
  it("filtra por cliente y exige proveedor antes de dejar pendiente de pedir", async () => {
    const escenario = new EscenarioPrueba();
    try {
      const administrador = await escenario.crearUsuario(
        RolUsuario.ADMINISTRADOR,
      );
      const localidad = await escenario.crearLocalidad();
      const [cliente, otroCliente] = await Promise.all([
        escenario.crearCliente(localidad.id, { indice: 1 }),
        escenario.crearCliente(localidad.id, { indice: 2 }),
      ]);
      const producto = await escenario.crearProducto({ existencia: 0 });
      const proveedor = await escenario.crearProveedor();

      const crearPedido = (clienteId: string) =>
        request(app)
          .post("/api/v1/pedidos")
          .set(cabeceras(administrador.token))
          .send({
            clienteId,
            items: [{ productoId: producto.id, cantidad: 1 }],
          })
          .expect(201);
      const [pedido, pedidoAjeno] = await Promise.all([
        crearPedido(cliente.id),
        crearPedido(otroCliente.id),
      ]);

      const directorioCliente = await request(app)
        .get(`/api/v1/pedidos?clienteId=${cliente.id}`)
        .set(cabeceras(administrador.token))
        .expect(200);
      expect(directorioCliente.body.datos).toHaveLength(1);
      expect(directorioCliente.body.datos[0].id).toBe(pedido.body.id);
      expect(directorioCliente.body.datos[0].id).not.toBe(pedidoAjeno.body.id);

      const sinProveedor = await request(app)
        .patch(`/api/v1/pedidos/${pedido.body.id}/estado`)
        .set(cabeceras(administrador.token))
        .send({ estado: "PEDIDO_PROVEEDOR" })
        .expect(422);
      expect(sinProveedor.body.error.codigo).toBe("PROVEEDOR_REQUERIDO");
      expect(
        (
          await prisma.pedidoVenta.findUniqueOrThrow({
            where: { id: pedido.body.id },
          })
        ).estado,
      ).toBe("PENDIENTE_PEDIR");

      await request(app)
        .patch(`/api/v1/pedidos/${pedido.body.id}/estado`)
        .set(cabeceras(administrador.token))
        .send({
          estado: "PEDIDO_PROVEEDOR",
          proveedores: [
            {
              itemPedidoId: pedido.body.items[0].id,
              proveedorId: proveedor.id,
            },
          ],
        })
        .expect(200);

      const actualizado = await prisma.pedidoVenta.findUniqueOrThrow({
        where: { id: pedido.body.id },
        include: { items: true },
      });
      expect(actualizado.estado).toBe("PEDIDO_PROVEEDOR");
      expect(actualizado.items[0]?.proveedorId).toBe(proveedor.id);

      const asignacionAjena = [
        {
          itemPedidoId: pedidoAjeno.body.items[0].id,
          proveedorId: proveedor.id,
        },
      ];
      const carreras = await Promise.all([
        request(app)
          .patch(`/api/v1/pedidos/${pedidoAjeno.body.id}/estado`)
          .set(cabeceras(administrador.token))
          .send({
            estado: "PEDIDO_PROVEEDOR",
            proveedores: asignacionAjena,
          }),
        request(app)
          .patch(`/api/v1/pedidos/${pedidoAjeno.body.id}/estado`)
          .set(cabeceras(administrador.token))
          .send({
            estado: "PEDIDO_PROVEEDOR",
            proveedores: asignacionAjena,
          }),
      ]);
      expect(carreras.map((respuesta) => respuesta.status).sort()).toEqual([
        200, 422,
      ]);
      expect(
        carreras.find((respuesta) => respuesta.status === 422)?.body.error
          .codigo,
      ).toBe("TRANSICION_INVALIDA");
    } finally {
      await escenario.limpiar();
    }
  });

  it("separa asignación de proveedor, almacén y entrega por rol", async () => {
    const escenario = new EscenarioPrueba();
    try {
      const [administrador, contable, almacenista, cobrador] =
        await Promise.all([
          escenario.crearUsuario(RolUsuario.ADMINISTRADOR),
          escenario.crearUsuario(RolUsuario.CONTABLE),
          escenario.crearUsuario(RolUsuario.ALMACENISTA),
          escenario.crearUsuario(RolUsuario.COBRADOR),
        ]);
      const localidad = await escenario.crearLocalidad();
      const cliente = await escenario.crearCliente(localidad.id);
      const producto = await escenario.crearProducto({ existencia: 4 });
      const proveedor = await escenario.crearProveedor();

      const crearPedido = () =>
        request(app)
          .post("/api/v1/pedidos")
          .set(cabeceras(administrador.token))
          .send({
            clienteId: cliente.id,
            items: [{ productoId: producto.id, cantidad: 1 }],
          })
          .expect(201);
      const [pedidoContable, pedidoCobrador] = await Promise.all([
        crearPedido(),
        crearPedido(),
      ]);
      const asignacion = (pedido: typeof pedidoContable.body) => ({
        estado: "PEDIDO_PROVEEDOR",
        proveedores: [
          {
            itemPedidoId: pedido.items[0].id,
            proveedorId: proveedor.id,
          },
        ],
      });

      await request(app)
        .patch(`/api/v1/pedidos/${pedidoContable.body.id}/estado`)
        .set(cabeceras(contable.token))
        .send(asignacion(pedidoContable.body))
        .expect(200);

      const contableRecibe = await request(app)
        .patch(`/api/v1/pedidos/${pedidoContable.body.id}/estado`)
        .set(cabeceras(contable.token))
        .send({ estado: "RECIBIDO_ALMACEN" })
        .expect(403);
      expect(contableRecibe.body.error.codigo).toBe("SIN_PERMISO");

      await request(app)
        .patch(`/api/v1/pedidos/${pedidoContable.body.id}/estado`)
        .set(cabeceras(almacenista.token))
        .send({ estado: "RECIBIDO_ALMACEN" })
        .expect(200);

      const cobradorAsigna = await request(app)
        .patch(`/api/v1/pedidos/${pedidoCobrador.body.id}/estado`)
        .set(cabeceras(cobrador.token))
        .send(asignacion(pedidoCobrador.body))
        .expect(403);
      expect(cobradorAsigna.body.error.codigo).toBe("SIN_PERMISO");
      expect(
        (
          await prisma.pedidoVenta.findUniqueOrThrow({
            where: { id: pedidoCobrador.body.id },
            include: { items: true },
          })
        ).items[0]?.proveedorId,
      ).toBeNull();

      await request(app)
        .patch(`/api/v1/pedidos/${pedidoCobrador.body.id}/estado`)
        .set(cabeceras(almacenista.token))
        .send(asignacion(pedidoCobrador.body))
        .expect(200);
    } finally {
      await escenario.limpiar();
    }
  });
});
