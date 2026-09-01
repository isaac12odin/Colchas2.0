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

describe.sequential("ajustes financieros y credenciales", () => {
  it("ajusta el saldo con reautenticación, libro, auditoría y control de concurrencia", async () => {
    const escenario = new EscenarioPrueba();
    const contrasena = "AjusteSeguro!2026";
    try {
      const administrador = await escenario.crearUsuarioAutenticable(
        RolUsuario.ADMINISTRADOR,
        contrasena,
      );
      const vendedor = await escenario.crearUsuario(RolUsuario.VENDEDOR);
      const localidad = await escenario.crearLocalidad();
      const cliente = await escenario.crearCliente(localidad.id, {
        saldo: 200,
      });
      const acceso = await request(app)
        .post("/api/v1/auth/iniciar-sesion")
        .set("X-Forwarded-For", "10.41.0.1")
        .send({
          correo: administrador.correo,
          contrasena,
          cliente: "MOVIL",
        })
        .expect(200);

      await request(app)
        .patch(`/api/v1/clientes/${cliente.id}/saldo`)
        .set(cabeceras(vendedor.token))
        .send({
          saldoActualEsperado: 200,
          nuevoSaldo: 150,
          motivo: "Intento sin permiso financiero",
          contrasenaActual: contrasena,
        })
        .expect(403);

      const claveIncorrecta = await request(app)
        .patch(`/api/v1/clientes/${cliente.id}/saldo`)
        .set(cabeceras(acceso.body.accessToken))
        .send({
          saldoActualEsperado: 200,
          nuevoSaldo: 150,
          motivo: "Corrección validada contra documento original",
          contrasenaActual: "Incorrecta!2026",
        })
        .expect(422);
      expect(claveIncorrecta.body.error.codigo).toBe("CONTRASENA_INVALIDA");

      const ajuste = await request(app)
        .patch(`/api/v1/clientes/${cliente.id}/saldo`)
        .set(cabeceras(acceso.body.accessToken))
        .send({
          saldoActualEsperado: 200,
          nuevoSaldo: 150,
          motivo: "Corrección validada contra documento original",
          contrasenaActual: contrasena,
        })
        .expect(200);
      expect(ajuste.body).toMatchObject({
        saldoAnterior: 200,
        saldoNuevo: 150,
        diferencia: -50,
      });

      const simultaneos = await Promise.all([
        request(app)
          .patch(`/api/v1/clientes/${cliente.id}/saldo`)
          .set(cabeceras(acceso.body.accessToken))
          .send({
            saldoActualEsperado: 150,
            nuevoSaldo: 160,
            motivo: "Primera corrección concurrente controlada",
            contrasenaActual: contrasena,
          }),
        request(app)
          .patch(`/api/v1/clientes/${cliente.id}/saldo`)
          .set(cabeceras(acceso.body.accessToken))
          .send({
            saldoActualEsperado: 150,
            nuevoSaldo: 170,
            motivo: "Segunda corrección concurrente controlada",
            contrasenaActual: contrasena,
          }),
      ]);
      expect(simultaneos.map((respuesta) => respuesta.status).sort()).toEqual([
        200, 409,
      ]);
      expect(
        simultaneos.find((respuesta) => respuesta.status === 409)?.body.error
          .codigo,
      ).toBe("SALDO_CAMBIO_CONCURRENTE");

      const [saldo, movimientos, auditorias] = await Promise.all([
        prisma.saldoCliente.findUniqueOrThrow({
          where: { clienteId: cliente.id },
        }),
        prisma.movimientoSaldo.findMany({
          where: {
            clienteId: cliente.id,
            tipo: { in: ["AJUSTE_ABONO", "AJUSTE_CARGO"] },
          },
          orderBy: { creadoEn: "asc" },
        }),
        prisma.auditoria.findMany({
          where: {
            usuarioId: administrador.id,
            entidadId: cliente.id,
            accion: "AJUSTAR_SALDO",
          },
        }),
      ]);
      expect([160, 170]).toContain(Number(saldo.saldoActual));
      expect(movimientos).toHaveLength(2);
      expect(movimientos[0]).toMatchObject({ tipo: "AJUSTE_ABONO" });
      expect(auditorias).toHaveLength(2);
    } finally {
      await escenario.limpiar();
    }
  });

  it("permite al administrador cambiar cualquier clave, incluida la propia", async () => {
    const escenario = new EscenarioPrueba();
    const claveAdmin = "AdminSegura!2026";
    const claveAnterior = "AnteriorSegura!2026";
    const claveTemporal = "TemporalNueva!2026";
    const claveAdminNueva = "admin6";
    try {
      const administrador = await escenario.crearUsuarioAutenticable(
        RolUsuario.ADMINISTRADOR,
        claveAdmin,
      );
      const objetivo = await escenario.crearUsuarioAutenticable(
        RolUsuario.COBRADOR,
        claveAnterior,
      );
      const accesoAdmin = await request(app)
        .post("/api/v1/auth/iniciar-sesion")
        .set("X-Forwarded-For", "10.42.0.1")
        .send({
          correo: administrador.correo,
          contrasena: claveAdmin,
          cliente: "MOVIL",
        })
        .expect(200);
      const accesoObjetivo = await request(app)
        .post("/api/v1/auth/iniciar-sesion")
        .set("X-Forwarded-For", "10.42.0.2")
        .send({
          correo: objetivo.correo,
          contrasena: claveAnterior,
          cliente: "MOVIL",
        })
        .expect(200);

      const incorrecta = await request(app)
        .post(`/api/v1/usuarios/${objetivo.id}/restablecer-contrasena`)
        .set(cabeceras(accesoAdmin.body.accessToken))
        .send({
          contrasenaAdministrador: "AdminIncorrecta!2026",
          contrasenaTemporal: claveTemporal,
        })
        .expect(422);
      expect(incorrecta.body.error.codigo).toBe("CONTRASENA_INVALIDA");

      await request(app)
        .post(`/api/v1/usuarios/${objetivo.id}/restablecer-contrasena`)
        .set(cabeceras(accesoAdmin.body.accessToken))
        .send({
          contrasenaAdministrador: claveAdmin,
          contrasenaTemporal: claveTemporal,
        })
        .expect(204);

      await request(app)
        .post("/api/v1/auth/renovar")
        .send({ refreshToken: accesoObjetivo.body.refreshToken })
        .expect(401);
      await request(app)
        .post("/api/v1/auth/iniciar-sesion")
        .set("X-Forwarded-For", "10.42.0.3")
        .send({
          correo: objetivo.correo,
          contrasena: claveAnterior,
          cliente: "MOVIL",
        })
        .expect(401);
      const accesoNuevo = await request(app)
        .post("/api/v1/auth/iniciar-sesion")
        .set("X-Forwarded-For", "10.42.0.4")
        .send({
          correo: objetivo.correo,
          contrasena: claveTemporal,
          cliente: "MOVIL",
        })
        .expect(200);
      expect(accesoNuevo.body.usuario.debeCambiarContrasena).toBe(true);
      const operacionBloqueada = await request(app)
        .get("/api/v1/clientes")
        .set(cabeceras(accesoNuevo.body.accessToken))
        .expect(428);
      expect(operacionBloqueada.body.error.codigo).toBe(
        "CAMBIO_CONTRASENA_REQUERIDO",
      );

      const auditoria = await prisma.auditoria.findFirst({
        where: {
          usuarioId: administrador.id,
          entidadId: objetivo.id,
          accion: "RESTABLECER_CONTRASENA",
        },
      });
      expect(auditoria).not.toBeNull();
      expect(JSON.stringify(auditoria)).not.toContain(claveTemporal);

      await request(app)
        .post(`/api/v1/usuarios/${administrador.id}/restablecer-contrasena`)
        .set(cabeceras(accesoAdmin.body.accessToken))
        .send({
          contrasenaAdministrador: claveAdmin,
          contrasenaTemporal: claveAdminNueva,
        })
        .expect(204);
      await request(app)
        .post("/api/v1/auth/iniciar-sesion")
        .set("X-Forwarded-For", "10.42.0.5")
        .send({
          correo: administrador.correo,
          contrasena: claveAdmin,
          cliente: "MOVIL",
        })
        .expect(401);
      const accesoAdminRestablecido = await request(app)
        .post("/api/v1/auth/iniciar-sesion")
        .set("X-Forwarded-For", "10.42.0.6")
        .send({
          correo: administrador.correo,
          contrasena: claveAdminNueva,
          cliente: "MOVIL",
        })
        .expect(200);
      expect(accesoAdminRestablecido.body.usuario.debeCambiarContrasena).toBe(
        true,
      );
    } finally {
      await escenario.limpiar();
    }
  });
});
