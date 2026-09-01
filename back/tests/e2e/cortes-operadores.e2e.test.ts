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

beforeAll(asegurarBaseDePruebas);
afterAll(() => prisma.$disconnect());

async function conEscenario(
  ejecutar: (escenario: EscenarioPrueba) => Promise<void>,
) {
  const escenario = new EscenarioPrueba();
  let falloOperacion: unknown;
  try {
    await ejecutar(escenario);
  } catch (error) {
    falloOperacion = error;
  }
  try {
    await escenario.limpiar();
  } catch (falloLimpieza) {
    if (falloOperacion)
      throw new AggregateError(
        [falloOperacion, falloLimpieza],
        `Fallaron tanto el escenario (${falloOperacion instanceof Error ? falloOperacion.message : String(falloOperacion)}) como su limpieza aislada (${falloLimpieza instanceof Error ? falloLimpieza.message : String(falloLimpieza)}).`,
      );
    throw falloLimpieza;
  }
  if (falloOperacion) throw falloOperacion;
}

describe.sequential("cortes por operador real", () => {
  it("incluye y sella el efectivo de Vendedor y los abonos de Contabilidad", () =>
    conEscenario(async (escenario) => {
      const [admin, contable, vendedor, cobrador, almacenista] =
        await Promise.all([
          escenario.crearUsuario(RolUsuario.ADMINISTRADOR),
          escenario.crearUsuario(RolUsuario.CONTABLE),
          escenario.crearUsuario(RolUsuario.VENDEDOR),
          escenario.crearUsuario(RolUsuario.COBRADOR),
          escenario.crearUsuario(RolUsuario.ALMACENISTA),
        ]);
      const localidad = await escenario.crearLocalidad();
      const cliente = await escenario.crearCliente(localidad.id, {
        saldo: 200,
      });
      const producto = await escenario.crearProducto({
        existencia: 3,
        precio: 200,
      });

      await request(app)
        .post("/api/v1/ventas")
        .set(cabeceras(vendedor.token))
        .send({
          idOperacionMovil: `web-${randomUUID()}`,
          tipo: "PUBLICO",
          metodoAnticipo: "EFECTIVO",
          items: [{ productoId: producto.id, cantidad: 1 }],
        })
        .expect(201);

      await request(app)
        .post("/api/v1/abonos")
        .set(cabeceras(contable.token))
        .send({
          idOperacionMovil: `web-${randomUUID()}`,
          clienteId: cliente.id,
          monto: 40,
          metodo: "TRANSFERENCIA",
        })
        .expect(201);

      const operadores = await request(app)
        .get("/api/v1/cortes/operadores")
        .set(cabeceras(admin.token))
        .expect(200);
      const ids = operadores.body.datos.map(
        (operador: { id: string }) => operador.id,
      );
      expect(ids).toEqual(
        expect.arrayContaining([
          admin.id,
          contable.id,
          vendedor.id,
          cobrador.id,
        ]),
      );
      expect(ids).not.toContain(almacenista.id);

      const fecha = fechaMexicoISO(new Date());
      const almacenRechazado = await request(app)
        .get(
          `/api/v1/cortes/previsualizar?usuarioOperadorId=${almacenista.id}&fecha=${fecha}`,
        )
        .set(cabeceras(admin.token))
        .expect(422);
      expect(almacenRechazado.body.error.codigo).toBe("OPERADOR_INVALIDO");

      const vistaVendedor = await request(app)
        .get(
          `/api/v1/cortes/previsualizar?usuarioOperadorId=${vendedor.id}&fecha=${fecha}`,
        )
        .set(cabeceras(admin.token))
        .expect(200);
      expect(vistaVendedor.body.operador.rol).toBe(RolUsuario.VENDEDOR);
      expect(vistaVendedor.body.sistema).toMatchObject({
        efectivo: 200,
        total: 200,
      });
      expect(vistaVendedor.body.ventasContado).toEqual({
        cantidad: 1,
        total: 200,
      });

      const vistaContable = await request(app)
        .get(
          `/api/v1/cortes/previsualizar?usuarioOperadorId=${contable.id}&fecha=${fecha}`,
        )
        .set(cabeceras(admin.token))
        .expect(200);
      expect(vistaContable.body.operador.rol).toBe(RolUsuario.CONTABLE);
      expect(vistaContable.body.sistema).toMatchObject({
        transferencia: 40,
        total: 40,
      });
      expect(vistaContable.body.abonos).toEqual({ cantidad: 1, total: 40 });

      await request(app)
        .post("/api/v1/cortes")
        .set(cabeceras(admin.token))
        .send({
          usuarioOperadorId: vendedor.id,
          fecha,
          efectivo: 200,
          transferencia: 0,
          tarjeta: 0,
          otro: 0,
          firmaNombre: admin.nombre,
          confirmacion: `CERRAR ${fecha}`,
        })
        .expect(201);

      await request(app)
        .post("/api/v1/cortes")
        .set(cabeceras(admin.token))
        .send({
          usuarioOperadorId: contable.id,
          fecha,
          efectivo: 0,
          transferencia: 40,
          tarjeta: 0,
          otro: 0,
          firmaNombre: admin.nombre,
          confirmacion: `CERRAR ${fecha}`,
        })
        .expect(201);

      const ventaTardia = await request(app)
        .post("/api/v1/ventas")
        .set(cabeceras(vendedor.token))
        .send({
          idOperacionMovil: `web-${randomUUID()}`,
          tipo: "PUBLICO",
          metodoAnticipo: "EFECTIVO",
          items: [{ productoId: producto.id, cantidad: 1 }],
        })
        .expect(409);
      expect(ventaTardia.body.error.codigo).toBe("JORNADA_CERRADA");

      const abonoTardio = await request(app)
        .post("/api/v1/abonos")
        .set(cabeceras(contable.token))
        .send({
          idOperacionMovil: `web-${randomUUID()}`,
          clienteId: cliente.id,
          monto: 1,
          metodo: "EFECTIVO",
        })
        .expect(409);
      expect(abonoTardio.body.error.codigo).toBe("JORNADA_CERRADA");
    }));

  it("serializa una venta de Vendedor concurrente con el cierre de su caja", () =>
    conEscenario(async (escenario) => {
      const [admin, vendedor] = await Promise.all([
        escenario.crearUsuario(RolUsuario.ADMINISTRADOR),
        escenario.crearUsuario(RolUsuario.VENDEDOR),
      ]);
      const producto = await escenario.crearProducto({
        existencia: 2,
        precio: 100,
      });
      const fecha = fechaMexicoISO(new Date());

      const [respuestaVenta, respuestaCorte] = await Promise.all([
        request(app)
          .post("/api/v1/ventas")
          .set(cabeceras(vendedor.token))
          .send({
            idOperacionMovil: `web-${randomUUID()}`,
            tipo: "PUBLICO",
            metodoAnticipo: "EFECTIVO",
            items: [{ productoId: producto.id, cantidad: 1 }],
          }),
        request(app)
          .post("/api/v1/cortes")
          .set(cabeceras(admin.token))
          .send({
            usuarioOperadorId: vendedor.id,
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
      expect([201, 409]).toContain(respuestaVenta.status);
      const corte = await prisma.corteCaja.findFirstOrThrow({
        where: { usuarioOperadorId: vendedor.id },
      });
      if (respuestaVenta.status === 201) {
        expect(corte.cantidadVentasContado).toBe(1);
        expect(Number(corte.efectivoSistema)).toBe(100);
      } else {
        expect(respuestaVenta.body.error.codigo).toBe("JORNADA_CERRADA");
        expect(corte.cantidadVentasContado).toBe(0);
        expect(Number(corte.efectivoSistema)).toBe(0);
      }
    }));

  it("rechaza y audita el límite enviado por Vendedor, pero permite el alta sin él", () =>
    conEscenario(async (escenario) => {
      const [vendedor, contable] = await Promise.all([
        escenario.crearUsuario(RolUsuario.VENDEDOR),
        escenario.crearUsuario(RolUsuario.CONTABLE),
      ]);
      const localidad = await escenario.crearLocalidad();
      const base = {
        telefono: "5551234567",
        direccion: "Avenida Control Financiero número 100",
        localidadId: localidad.id,
      };

      const rechazada = await request(app)
        .post("/api/v1/clientes")
        .set(cabeceras(vendedor.token))
        .send({
          ...base,
          nombreCompleto: `Cliente rechazado ${escenario.marca}`,
          limiteCredito: 1_500,
        })
        .expect(403);
      expect(rechazada.body.error.codigo).toBe("CAMPO_FINANCIERO_RESTRINGIDO");

      const auditoria = await prisma.auditoria.findFirst({
        where: {
          usuarioId: vendedor.id,
          entidad: "Cliente",
          accion: "RECHAZAR_LIMITE_CREDITO",
        },
        orderBy: { creadoEn: "desc" },
      });
      expect(auditoria?.datosDespues).toMatchObject({
        resultado: "RECHAZADO",
        campo: "limiteCredito",
        rol: RolUsuario.VENDEDOR,
      });

      const altaVendedor = await request(app)
        .post("/api/v1/clientes")
        .set(cabeceras(vendedor.token))
        .send({
          ...base,
          telefono: "5551234568",
          nombreCompleto: `Cliente vendedor ${escenario.marca}`,
        })
        .expect(201);
      escenario.registrarCliente(altaVendedor.body.id);
      expect(Number(altaVendedor.body.limiteCredito)).toBe(0);

      const altaContable = await request(app)
        .post("/api/v1/clientes")
        .set(cabeceras(contable.token))
        .send({
          ...base,
          telefono: "5551234569",
          nombreCompleto: `Cliente contable ${escenario.marca}`,
          limiteCredito: 1_200,
        })
        .expect(201);
      escenario.registrarCliente(altaContable.body.id);
      expect(Number(altaContable.body.limiteCredito)).toBe(1_200);
    }));
});
