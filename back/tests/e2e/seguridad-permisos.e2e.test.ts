import { DiaSemana, RolUsuario } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { app } from "../../src/app.js";
import { prisma } from "../../src/infraestructura/prisma.js";
import { codigoParaContador } from "../../src/seguridad/mfa.js";
import {
  asegurarBaseDePruebas,
  cabeceras,
  EscenarioPrueba,
} from "./escenario.js";

beforeAll(asegurarBaseDePruebas);
afterAll(() => prisma.$disconnect());

describe.sequential("seguridad de sesión", () => {
  it("publica salud y disponibilidad real de PostgreSQL sin autenticación", async () => {
    const salud = await request(app).get("/salud").expect(200);
    expect(salud.body).toMatchObject({ estado: "ok", servicio: "nexo-api" });
    const lista = await request(app).get("/salud/listo").expect(200);
    expect(lista.body).toMatchObject({
      estado: "listo",
      baseDatos: "disponible",
    });
  });

  it("rechaza rutas protegidas sin token y con token manipulado", async () => {
    const sinToken = await request(app).get("/api/v1/clientes").expect(401);
    expect(sinToken.body.error.codigo).toBe("NO_AUTENTICADO");
    const manipulado = await request(app)
      .get("/api/v1/clientes")
      .set({ Authorization: "Bearer token.invalido.manipulado" })
      .expect(401);
    expect(manipulado.body.error.codigo).toBe("SESION_EXPIRADA");
  });

  it("obliga a cambiar la contraseña temporal mediante una sesión web real", async () => {
    const escenario = new EscenarioPrueba();
    const contrasenaTemporal = "TemporalE2E!2026";
    const contrasenaNueva = "DefinitivaE2E!2026";
    try {
      const usuario = await escenario.crearUsuarioAutenticable(
        RolUsuario.ADMINISTRADOR,
        contrasenaTemporal,
        true,
      );
      const agente = request.agent(app);
      const acceso = await agente
        .post("/api/v1/auth/iniciar-sesion")
        .set("X-Forwarded-For", "10.29.0.1")
        .send({
          correo: usuario.correo,
          contrasena: contrasenaTemporal,
          cliente: "WEB",
        })
        .expect(200);
      const cookies = acceso.headers["set-cookie"] as unknown as string[];
      expect(cookies.join(";")).toContain("access_token=");
      expect(cookies.join(";")).toContain("refresh_token=");
      expect(cookies.join(";")).toContain("csrf_token=");
      expect(acceso.body.usuario.debeCambiarContrasena).toBe(true);

      const bloqueada = await agente.get("/api/v1/clientes").expect(428);
      expect(bloqueada.body.error.codigo).toBe("CAMBIO_CONTRASENA_REQUERIDO");
      await agente.get("/api/v1/auth/sesion").expect(200);

      await agente
        .post("/api/v1/auth/cambiar-contrasena")
        .set("X-CSRF-Token", acceso.body.csrfToken)
        .send({
          contrasenaActual: contrasenaTemporal,
          nuevaContrasena: contrasenaNueva,
        })
        .expect(204);
      expect(
        (
          await prisma.usuario.findUniqueOrThrow({
            where: { id: usuario.id },
          })
        ).debeCambiarContrasena,
      ).toBe(false);
      await request(app)
        .post("/api/v1/auth/iniciar-sesion")
        .set("X-Forwarded-For", "10.29.0.2")
        .send({
          correo: usuario.correo,
          contrasena: contrasenaTemporal,
          cliente: "MOVIL",
        })
        .expect(401);
      const definitivo = await request(app)
        .post("/api/v1/auth/iniciar-sesion")
        .set("X-Forwarded-For", "10.29.0.3")
        .send({
          correo: usuario.correo,
          contrasena: contrasenaNueva,
          cliente: "MOVIL",
        })
        .expect(200);
      expect(definitivo.body.usuario.debeCambiarContrasena).toBe(false);
    } finally {
      await escenario.limpiar();
    }
  });

  it("exige CSRF en sesiones web y acepta el encabezado correcto", async () => {
    const escenario = new EscenarioPrueba();
    const contrasena = "ClaveWebE2E!2026";
    try {
      const usuario = await escenario.crearUsuarioAutenticable(
        RolUsuario.ADMINISTRADOR,
        contrasena,
      );
      const agente = request.agent(app);
      const acceso = await agente
        .post("/api/v1/auth/iniciar-sesion")
        .set(
          "X-Forwarded-For",
          `10.30.0.${Number.parseInt(escenario.marca[0]!, 16) + 1}`,
        )
        .send({ correo: usuario.correo, contrasena, cliente: "WEB" })
        .expect(200);
      expect(acceso.headers["set-cookie"]).toBeTruthy();

      const bloqueada = await agente
        .patch(`/api/v1/usuarios/${usuario.id}`)
        .send({ nombre: "Intento sin CSRF" })
        .expect(403);
      expect(bloqueada.body.error.codigo).toBe("CSRF_INVALIDO");

      await agente
        .patch(`/api/v1/usuarios/${usuario.id}`)
        .set("X-CSRF-Token", acceso.body.csrfToken)
        .send({ nombre: `Administrador CSRF ${escenario.marca}` })
        .expect(200);
    } finally {
      await escenario.limpiar();
    }
  });

  it("rota el refresh token móvil y revoca inmediatamente el anterior", async () => {
    const escenario = new EscenarioPrueba();
    const contrasena = "ClaveMovilE2E!2026";
    try {
      const usuario = await escenario.crearUsuarioAutenticable(
        RolUsuario.COBRADOR,
        contrasena,
      );
      const acceso = await request(app)
        .post("/api/v1/auth/iniciar-sesion")
        .set("X-Forwarded-For", "10.31.0.1")
        .send({ correo: usuario.correo, contrasena, cliente: "MOVIL" })
        .expect(200);
      expect(acceso.body.accessToken).toBeTypeOf("string");
      expect(acceso.body.refreshToken).toBeTypeOf("string");

      const renovada = await request(app)
        .post("/api/v1/auth/renovar")
        .send({ refreshToken: acceso.body.refreshToken })
        .expect(200);
      expect(renovada.body.refreshToken).not.toBe(acceso.body.refreshToken);

      const reutilizacion = await request(app)
        .post("/api/v1/auth/renovar")
        .send({ refreshToken: acceso.body.refreshToken })
        .expect(401);
      expect(reutilizacion.body.error.codigo).toBe("REFRESCO_INVALIDO");
    } finally {
      await escenario.limpiar();
    }
  });

  it("mantiene CSRF obligatorio al renovar una sesión web", async () => {
    const escenario = new EscenarioPrueba();
    const contrasena = "ClaveWebRenovarE2E!2026";
    try {
      const usuario = await escenario.crearUsuarioAutenticable(
        RolUsuario.CONTABLE,
        contrasena,
      );
      const agente = request.agent(app);
      const acceso = await agente
        .post("/api/v1/auth/iniciar-sesion")
        .set("X-Forwarded-For", "10.31.1.1")
        .send({ correo: usuario.correo, contrasena, cliente: "WEB" })
        .expect(200);

      await agente.post("/api/v1/auth/renovar").expect(403);
      const renovada = await agente
        .post("/api/v1/auth/renovar")
        .set("X-CSRF-Token", acceso.body.csrfToken)
        .expect(200);
      expect(renovada.body.csrfToken).toBeTypeOf("string");
      expect(renovada.body).not.toHaveProperty("refreshToken");
    } finally {
      await escenario.limpiar();
    }
  });

  it("permite cerrar la sesión móvil y revoca su refresh token", async () => {
    const escenario = new EscenarioPrueba();
    const contrasena = "ClaveMovilCerrarE2E!2026";
    try {
      const usuario = await escenario.crearUsuarioAutenticable(
        RolUsuario.COBRADOR,
        contrasena,
      );
      const acceso = await request(app)
        .post("/api/v1/auth/iniciar-sesion")
        .set("X-Forwarded-For", "10.31.2.1")
        .send({ correo: usuario.correo, contrasena, cliente: "MOVIL" })
        .expect(200);

      await request(app)
        .post("/api/v1/auth/cerrar-sesion")
        .send({ refreshToken: acceso.body.refreshToken })
        .expect(204);
      await request(app)
        .post("/api/v1/auth/renovar")
        .send({ refreshToken: acceso.body.refreshToken })
        .expect(401);
    } finally {
      await escenario.limpiar();
    }
  });

  it("bloquea temporalmente la cuenta después de cinco claves incorrectas", async () => {
    const escenario = new EscenarioPrueba();
    const contrasena = "ClaveCorrectaE2E!2026";
    try {
      const usuario = await escenario.crearUsuarioAutenticable(
        RolUsuario.CONTABLE,
        contrasena,
      );
      for (let intento = 0; intento < 5; intento += 1) {
        await request(app)
          .post("/api/v1/auth/iniciar-sesion")
          .set("X-Forwarded-For", "10.32.0.1")
          .send({
            correo: usuario.correo,
            contrasena: `Incorrecta!${intento}XYZ`,
            cliente: "MOVIL",
          })
          .expect(401);
      }
      const bloqueada = await request(app)
        .post("/api/v1/auth/iniciar-sesion")
        .set("X-Forwarded-For", "10.32.0.1")
        .send({ correo: usuario.correo, contrasena, cliente: "MOVIL" })
        .expect(423);
      expect(bloqueada.body.error.codigo).toBe("CUENTA_BLOQUEADA");
      const estado = await prisma.usuario.findUniqueOrThrow({
        where: { id: usuario.id },
      });
      expect(estado.intentosFallidos).toBe(5);
      expect(estado.bloqueadoHasta).not.toBeNull();
    } finally {
      await escenario.limpiar();
    }
  });

  it("habilita MFA, solicita el código y rechaza su reutilización", async () => {
    const escenario = new EscenarioPrueba();
    const contrasena = "ClaveMfaE2E!2026";
    try {
      const usuario = await escenario.crearUsuarioAutenticable(
        RolUsuario.ADMINISTRADOR,
        contrasena,
      );
      const accesoInicial = await request(app)
        .post("/api/v1/auth/iniciar-sesion")
        .set("X-Forwarded-For", "10.33.0.1")
        .send({ correo: usuario.correo, contrasena, cliente: "MOVIL" })
        .expect(200);
      const token = accesoInicial.body.accessToken as string;
      const inicio = await request(app)
        .post("/api/v1/auth/mfa/iniciar")
        .set(cabeceras(token))
        .expect(200);
      expect(inicio.body.secreto).toMatch(/^[A-Z2-7]+$/);

      const contadorActual = BigInt(Math.floor(Date.now() / 30_000));
      const codigoAnterior = codigoParaContador(
        inicio.body.secreto,
        contadorActual - 1n,
      );
      await request(app)
        .post("/api/v1/auth/mfa/confirmar")
        .set(cabeceras(token))
        .send({ codigo: codigoAnterior })
        .expect(204);

      const requerido = await request(app)
        .post("/api/v1/auth/iniciar-sesion")
        .set("X-Forwarded-For", "10.33.0.1")
        .send({ correo: usuario.correo, contrasena, cliente: "MOVIL" })
        .expect(202);
      expect(requerido.body.mfaRequerido).toBe(true);

      const codigoActual = codigoParaContador(
        inicio.body.secreto,
        contadorActual,
      );
      await request(app)
        .post("/api/v1/auth/iniciar-sesion")
        .set("X-Forwarded-For", "10.33.0.1")
        .send({
          correo: usuario.correo,
          contrasena,
          cliente: "MOVIL",
          codigoMfa: codigoActual,
        })
        .expect(200);
      const reutilizado = await request(app)
        .post("/api/v1/auth/iniciar-sesion")
        .set("X-Forwarded-For", "10.33.0.1")
        .send({
          correo: usuario.correo,
          contrasena,
          cliente: "MOVIL",
          codigoMfa: codigoActual,
        })
        .expect(401);
      expect(reutilizado.body.error.codigo).toBe("MFA_INVALIDO");
    } finally {
      await escenario.limpiar();
    }
  });

  it("conserva como máximo cinco sesiones activas por usuario", async () => {
    const escenario = new EscenarioPrueba();
    const contrasena = "ClaveSesionesE2E!2026";
    try {
      const usuario = await escenario.crearUsuarioAutenticable(
        RolUsuario.VENDEDOR,
        contrasena,
      );
      for (let indice = 1; indice <= 6; indice += 1) {
        await request(app)
          .post("/api/v1/auth/iniciar-sesion")
          .set("X-Forwarded-For", `10.34.${indice}.1`)
          .send({ correo: usuario.correo, contrasena, cliente: "MOVIL" })
          .expect(200);
      }
      expect(
        await prisma.sesion.count({
          where: { usuarioId: usuario.id, revocadaEn: null },
        }),
      ).toBe(5);
      expect(
        await prisma.sesion.count({
          where: { usuarioId: usuario.id, revocadaEn: { not: null } },
        }),
      ).toBe(1);
    } finally {
      await escenario.limpiar();
    }
  });
});

describe.sequential("autorización por asignación de datos", () => {
  it("aísla clientes, expedientes, abonos y rutas entre cobradores", async () => {
    const escenario = new EscenarioPrueba();
    try {
      const [admin, cobradorA, cobradorB] = await Promise.all([
        escenario.crearUsuario(RolUsuario.ADMINISTRADOR),
        escenario.crearUsuario(RolUsuario.COBRADOR),
        escenario.crearUsuario(RolUsuario.COBRADOR),
      ]);
      const [localidadA, localidadB] = await Promise.all([
        escenario.crearLocalidad(1),
        escenario.crearLocalidad(2),
      ]);
      const [clienteA, clienteB] = await Promise.all([
        escenario.crearCliente(localidadA.id, { indice: 1, saldo: 500 }),
        escenario.crearCliente(localidadB.id, { indice: 2, saldo: 500 }),
      ]);
      const [rutaA, rutaB] = await Promise.all([
        escenario.crearRuta(
          [localidadA.id],
          [clienteA.id],
          DiaSemana.LUNES,
          cobradorA.id,
        ),
        escenario.crearRuta(
          [localidadB.id],
          [clienteB.id],
          DiaSemana.MARTES,
          cobradorB.id,
        ),
      ]);

      const clientes = await request(app)
        .get("/api/v1/clientes?limite=100")
        .set(cabeceras(cobradorA.token))
        .expect(200);
      expect(clientes.body.datos.map((item: { id: string }) => item.id)).toContain(
        clienteA.id,
      );
      expect(clientes.body.datos.map((item: { id: string }) => item.id)).not.toContain(
        clienteB.id,
      );
      await request(app)
        .get(`/api/v1/clientes/${clienteB.id}`)
        .set(cabeceras(cobradorA.token))
        .expect(404);

      const rutas = await request(app)
        .get("/api/v1/rutas")
        .set(cabeceras(cobradorA.token))
        .expect(200);
      expect(rutas.body.datos.map((item: { id: string }) => item.id)).toEqual([
        rutaA.id,
      ]);
      await request(app)
        .get(`/api/v1/rutas/${rutaB.id}/jornada`)
        .set(cabeceras(cobradorA.token))
        .expect(403);

      const ajeno = await request(app)
        .post("/api/v1/abonos")
        .set(cabeceras(cobradorA.token))
        .send({ clienteId: clienteB.id, monto: 50 })
        .expect(403);
      expect(ajeno.body.error.codigo).toBe("CLIENTE_NO_ASIGNADO");
      await request(app)
        .post("/api/v1/abonos")
        .set(cabeceras(cobradorA.token))
        .send({ clienteId: clienteA.id, monto: 50 })
        .expect(201);

      const vistaAdmin = await request(app)
        .get(`/api/v1/clientes/${clienteB.id}`)
        .set(cabeceras(admin.token))
        .expect(200);
      expect(vistaAdmin.body.id).toBe(clienteB.id);
    } finally {
      await escenario.limpiar();
    }
  });
});

const casosDenegados = [
  [RolUsuario.CONTABLE, "POST", "/api/v1/inventario/productos"],
  [RolUsuario.VENDEDOR, "GET", "/api/v1/reportes/resumen"],
  [RolUsuario.ALMACENISTA, "GET", "/api/v1/cortes"],
  [RolUsuario.COBRADOR, "POST", "/api/v1/compras"],
  [RolUsuario.VENDEDOR, "POST", "/api/v1/proveedores"],
  [RolUsuario.ALMACENISTA, "POST", "/api/v1/devoluciones"],
  [RolUsuario.CONTABLE, "POST", "/api/v1/importaciones/excel"],
  [RolUsuario.COBRADOR, "GET", "/api/v1/auditoria"],
  [RolUsuario.VENDEDOR, "POST", "/api/v1/rutas"],
  [RolUsuario.ALMACENISTA, "POST", "/api/v1/clientes"],
] as const;

describe.sequential("matriz HTTP de permisos denegados", () => {
  it.each(casosDenegados)(
    "%s no puede ejecutar %s %s",
    async (rol, metodo, ruta) => {
      const escenario = new EscenarioPrueba();
      try {
        const usuario = await escenario.crearUsuario(rol);
        const solicitud = request(app)
          [metodo.toLowerCase() as "get"](ruta)
          .set(cabeceras(usuario.token));
        const respuesta = await solicitud.send({}).expect(403);
        expect(respuesta.body.error.codigo).toBe("SIN_PERMISO");
      } finally {
        await escenario.limpiar();
      }
    },
  );
});
