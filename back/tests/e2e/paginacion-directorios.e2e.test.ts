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

describe.sequential("directorios paginados", () => {
  it("pagina, busca y filtra usuarios desde PostgreSQL", async () => {
    const escenario = new EscenarioPrueba();
    try {
      const [administrador, contable, cobradorActivo, cobradorInactivo] =
        await Promise.all([
          escenario.crearUsuario(RolUsuario.ADMINISTRADOR),
          escenario.crearUsuario(RolUsuario.CONTABLE),
          escenario.crearUsuario(RolUsuario.COBRADOR),
          escenario.crearUsuario(RolUsuario.COBRADOR),
        ]);
      await prisma.usuario.update({
        where: { id: cobradorInactivo.id },
        data: { activo: false },
      });

      const segundaPagina = await request(app)
        .get(`/api/v1/usuarios?buscar=${escenario.marca}&pagina=2&limite=2`)
        .set(cabeceras(administrador.token))
        .expect(200);
      expect(segundaPagina.body.paginacion).toEqual({
        pagina: 2,
        limite: 2,
        total: 4,
        totalPaginas: 2,
      });
      expect(segundaPagina.body.datos).toHaveLength(2);

      const cobradoresActivos = await request(app)
        .get(
          `/api/v1/usuarios?buscar=${escenario.marca}&rol=COBRADOR&activo=true`,
        )
        .set(cabeceras(administrador.token))
        .expect(200);
      expect(cobradoresActivos.body.paginacion.total).toBe(1);
      expect(cobradoresActivos.body.datos).toEqual([
        expect.objectContaining({ id: cobradorActivo.id, activo: true }),
      ]);
      expect(
        cobradoresActivos.body.datos.some(
          (usuario: { id: string }) => usuario.id === contable.id,
        ),
      ).toBe(false);
    } finally {
      await escenario.limpiar();
    }
  });

  it("pagina pedidos y busca por cliente, tarjeta, producto y folio", async () => {
    const escenario = new EscenarioPrueba();
    try {
      const administrador = await escenario.crearUsuario(
        RolUsuario.ADMINISTRADOR,
      );
      const localidad = await escenario.crearLocalidad();
      const clientes = await Promise.all([
        escenario.crearCliente(localidad.id, {
          indice: 1,
          tarjeta: `TAR-${escenario.marca}-1`,
        }),
        escenario.crearCliente(localidad.id, { indice: 2 }),
        escenario.crearCliente(localidad.id, { indice: 3 }),
      ]);
      const producto = await escenario.crearProducto({ existencia: 0 });
      const pedidos = await Promise.all(
        clientes.map((cliente) =>
          request(app)
            .post("/api/v1/pedidos")
            .set(cabeceras(administrador.token))
            .send({
              clienteId: cliente.id,
              items: [{ productoId: producto.id, cantidad: 1 }],
            })
            .expect(201),
        ),
      );

      const segundaPagina = await request(app)
        .get(`/api/v1/pedidos?buscar=${escenario.marca}&pagina=2&limite=2`)
        .set(cabeceras(administrador.token))
        .expect(200);
      expect(segundaPagina.body.paginacion).toEqual({
        pagina: 2,
        limite: 2,
        total: 3,
        totalPaginas: 2,
      });
      expect(segundaPagina.body.datos).toHaveLength(1);

      for (const buscar of [
        clientes[0]!.nombreCompleto,
        `TAR-${escenario.marca}-1`,
        producto.sku,
        pedidos[0]!.body.folio,
      ]) {
        const resultado = await request(app)
          .get(`/api/v1/pedidos?buscar=${encodeURIComponent(buscar)}`)
          .set(cabeceras(administrador.token))
          .expect(200);
        expect(resultado.body.datos).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: pedidos[0]!.body.id }),
          ]),
        );
      }

      const pedidoDirecto = await request(app)
        .get(`/api/v1/pedidos?pedidoId=${pedidos[1]!.body.id}&limite=1`)
        .set(cabeceras(administrador.token))
        .expect(200);
      expect(pedidoDirecto.body.datos).toEqual([
        expect.objectContaining({ id: pedidos[1]!.body.id }),
      ]);
    } finally {
      await escenario.limpiar();
    }
  });
});
