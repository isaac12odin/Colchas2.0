import { randomUUID } from "node:crypto";

import { RolUsuario } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { app } from "../../src/app.js";
import { prisma } from "../../src/infraestructura/prisma.js";
import { reconciliarProyecciones } from "../../src/modulos/reconciliacion/servicio.js";
import {
  asegurarBaseDePruebas,
  cabeceras,
  EscenarioPrueba,
} from "./escenario.js";

beforeAll(asegurarBaseDePruebas);
afterAll(() => prisma.$disconnect());

describe.sequential("conciliación y restricciones físicas", () => {
  it("detecta una proyección de inventario alterada sin corregirla", async () => {
    const escenario = new EscenarioPrueba();
    try {
      const administrador = await escenario.crearUsuario(
        RolUsuario.ADMINISTRADOR,
      );
      const categoriaId = await escenario.categoriaProductoId();
      const sku = `REC-${escenario.marca}`;
      escenario.registrarProductoEsperado(sku);
      const creado = await request(app)
        .post("/api/v1/inventario/productos")
        .set(cabeceras(administrador.token))
        .send({
          sku,
          nombre: "Producto conciliable",
          marca: "Nexo E2E",
          categoriaId,
          precioCompra: 50,
          precioVenta: 100,
          existenciaInicial: 3,
          existenciaMinima: 1,
        })
        .expect(201);
      escenario.productoIds.add(creado.body.id);

      await prisma.producto.update({
        where: { id: creado.body.id },
        data: { existencia: { increment: 1 } },
      });
      const resultado = await reconciliarProyecciones();
      expect(resultado.diferencias).toContainEqual(
        expect.objectContaining({
          libro: "INVENTARIO",
          entidadId: creado.body.id,
          codigo: "PROYECCION_DIFERENTE",
          esperado: 3,
          actual: 4,
        }),
      );
      expect(
        (
          await prisma.producto.findUniqueOrThrow({
            where: { id: creado.body.id },
          })
        ).existencia,
      ).toBe(4);

      await prisma.producto.update({
        where: { id: creado.body.id },
        data: { existencia: 3 },
      });
    } finally {
      await escenario.limpiar();
    }
  });

  it("PostgreSQL permite una ruta web activa sin cobrador móvil", async () => {
    const rutaWeb = await prisma.ruta.create({
      data: {
        nombre: `Ruta administrativa ${randomUUID()}`,
        diaSemana: "LUNES",
        activa: true,
        cobradorId: null,
      },
    });
    expect(rutaWeb).toMatchObject({ activa: true, cobradorId: null });
    await prisma.ruta.delete({ where: { id: rutaWeb.id } });
  });

  it("PostgreSQL rechaza dinero y existencias negativas aun fuera de la API", async () => {
    await expect(
      prisma.$executeRaw`
        INSERT INTO "productos"
          ("id", "sku", "nombre", "marca", "existencia", "existenciaMinima", "precioVenta", "precioCompra", "activo", "creadoEn", "actualizadoEn")
        VALUES
          (${randomUUID()}::uuid, ${`NEG-${randomUUID()}`}, 'Inválido', 'E2E', -1, 0, 10, 5, true, NOW(), NOW())
      `,
    ).rejects.toThrow();
  });
});
