import { expect, test, type Route } from "@playwright/test";

import { api, ErrorApi } from "../../lib/api";

const administradora = {
  id: "00000000-0000-4000-8000-000000000081",
  nombre: "Administradora Integridad",
  correo: "integridad@nexo.test",
  rol: "ADMINISTRADOR",
  debeCambiarContrasena: false,
  mfaHabilitado: true,
};

async function json(route: Route, estado: number, cuerpo: unknown) {
  await route.fulfill({
    status: estado,
    contentType: "application/json",
    body: JSON.stringify(cuerpo),
  });
}

test("una query practica inventada nunca intercepta el inicio de sesión", async ({
  page,
}) => {
  let iniciosSesion = 0;
  let solicitudId = "";
  await page.route("**/api/**", async (route) => {
    const ruta = new URL(route.request().url()).pathname;
    if (ruta.endsWith("/auth/sesion"))
      return json(route, 401, {
        error: { codigo: "NO_AUTENTICADO", mensaje: "Sin sesión" },
      });
    if (ruta.endsWith("/auth/renovar"))
      return json(route, 401, {
        error: { codigo: "REFRESH_INVALIDO", mensaje: "Sin renovación" },
      });
    if (ruta.endsWith("/auth/iniciar-sesion")) {
      iniciosSesion += 1;
      solicitudId = route.request().headers()["x-request-id"] ?? "";
      return json(route, 200, { usuario: administradora });
    }
    if (ruta.endsWith("/alertas"))
      return json(route, 200, { totales: { total: 0 } });
    if (ruta.endsWith("/reportes/resumen"))
      return json(route, 200, {
        periodo: { tipo: "MES", desde: "2026-09-01", hasta: "2026-09-30" },
        ventas: {
          total: 0,
          bruto: 0,
          devoluciones: 0,
          operaciones: 0,
          operacionesDevueltas: 0,
        },
        abonos: { total: 0, operaciones: 0 },
        compras: { total: 0, operaciones: 0 },
        cartera: { saldo: 0, vencido: 0 },
        operacion: {
          clientesActivos: 0,
          pedidosPendientes: 0,
          productosBajoMinimo: 0,
          valorInventarioCosto: 0,
        },
      });
    return json(route, 404, {
      error: { codigo: "NO_MOCK", mensaje: `Sin mock para ${ruta}` },
    });
  });

  await page.goto("/?practica=leccion-inventada");
  await page.getByLabel("Correo electrónico").fill(administradora.correo);
  await page.getByLabel("Contraseña").fill("Integridad!2026");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  await expect(page).toHaveURL(/\/inicio$/);
  expect(iniciosSesion).toBe(1);
  expect(solicitudId).toMatch(/^[A-Za-z0-9._:-]{8,128}$/);
});

test("renueva la sesión inicial expirada antes de mostrar el panel", async ({
  page,
}) => {
  let consultasSesion = 0;
  let renovaciones = 0;
  await page.route("**/api/**", async (route) => {
    const ruta = new URL(route.request().url()).pathname;
    if (ruta.endsWith("/auth/sesion")) {
      consultasSesion += 1;
      if (consultasSesion === 1)
        return json(route, 401, {
          error: { codigo: "ACCESS_EXPIRADO", mensaje: "Access expirado" },
        });
      return json(route, 200, { usuario: administradora });
    }
    if (ruta.endsWith("/auth/renovar")) {
      renovaciones += 1;
      return route.fulfill({ status: 204 });
    }
    if (ruta.endsWith("/alertas"))
      return json(route, 200, { totales: { total: 0 } });
    if (ruta.endsWith("/usuarios")) return json(route, 200, { datos: [] });
    return json(route, 404, {
      error: { codigo: "NO_MOCK", mensaje: `Sin mock para ${ruta}` },
    });
  });

  await page.goto("/usuarios");
  await expect(
    page.getByRole("heading", { name: "Usuarios", exact: true }),
  ).toBeVisible();
  expect(consultasSesion).toBe(2);
  expect(renovaciones).toBe(1);
});

test("una renovación revocada limpia el panel y vuelve al acceso", async ({
  page,
}) => {
  let consultasUsuarios = 0;
  let forzarExpiracion = false;
  await page.route("**/api/**", async (route) => {
    const ruta = new URL(route.request().url()).pathname;
    if (ruta.endsWith("/auth/sesion"))
      return json(route, 200, { usuario: administradora });
    if (ruta.endsWith("/auth/renovar"))
      return json(route, 401, {
        error: { codigo: "REFRESH_REVOCADO", mensaje: "Sesión revocada" },
      });
    if (ruta.endsWith("/alertas"))
      return json(route, 200, { totales: { total: 0 } });
    if (ruta.endsWith("/usuarios")) {
      consultasUsuarios += 1;
      if (!forzarExpiracion)
        return json(route, 200, {
          datos: [
            {
              ...administradora,
              activo: true,
              ultimoAcceso: null,
            },
          ],
        });
      return json(route, 401, {
        error: { codigo: "ACCESS_EXPIRADO", mensaje: "Sesión expirada" },
      });
    }
    return json(route, 404, {
      error: { codigo: "NO_MOCK", mensaje: `Sin mock para ${ruta}` },
    });
  });

  await page.goto("/usuarios");
  await expect(page.getByText(administradora.correo)).toBeVisible();
  forzarExpiracion = true;
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("nexo:datos-cambiaron", {
        detail: {
          metodo: "PATCH",
          ruta: "/usuarios/otro",
          ocurridoEn: Date.now(),
          recursos: ["usuarios"],
        },
      }),
    ),
  );

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByLabel("Correo electrónico")).toBeVisible();
  await expect(page.getByText(administradora.correo)).toHaveCount(0);
  expect(consultasUsuarios).toBeGreaterThanOrEqual(2);
});

test("cerrar sesión en una pestaña invalida inmediatamente las demás", async ({
  context,
}) => {
  let cierresSesion = 0;
  await context.route("**/api/**", async (route) => {
    const ruta = new URL(route.request().url()).pathname;
    if (ruta.endsWith("/auth/sesion"))
      return json(route, 200, { usuario: administradora });
    if (ruta.endsWith("/auth/cerrar-sesion")) {
      cierresSesion += 1;
      return route.fulfill({ status: 204 });
    }
    if (ruta.endsWith("/alertas"))
      return json(route, 200, { totales: { total: 0 } });
    if (ruta.endsWith("/reportes/resumen"))
      return json(route, 200, {
        periodo: { tipo: "MES", desde: "2026-09-01", hasta: "2026-09-30" },
        ventas: {
          total: 0,
          bruto: 0,
          devoluciones: 0,
          operaciones: 0,
          operacionesDevueltas: 0,
        },
        abonos: { total: 0, operaciones: 0 },
        compras: { total: 0, operaciones: 0 },
        cartera: { saldo: 0, vencido: 0 },
        operacion: {
          clientesActivos: 0,
          pedidosPendientes: 0,
          productosBajoMinimo: 0,
          valorInventarioCosto: 0,
        },
      });
    return json(route, 404, {
      error: { codigo: "NO_MOCK", mensaje: `Sin mock para ${ruta}` },
    });
  });

  const primera = await context.newPage();
  const segunda = await context.newPage();
  await Promise.all([primera.goto("/inicio"), segunda.goto("/inicio")]);
  await Promise.all([
    expect(
      primera.getByRole("button", { name: "Buscar en Vektra" }),
    ).toBeVisible(),
    expect(
      segunda.getByRole("button", { name: "Buscar en Vektra" }),
    ).toBeVisible(),
  ]);

  await primera.getByRole("button", { name: "Cerrar sesión" }).click();

  await Promise.all([
    expect(primera).toHaveURL(/\/$/),
    expect(segunda).toHaveURL(/\/$/),
  ]);
  await expect(segunda.getByLabel("Correo electrónico")).toBeVisible();
  await expect(
    segunda.getByRole("button", { name: "Buscar en Vektra" }),
  ).toHaveCount(0);
  expect(cierresSesion).toBe(1);
});

test("una mutación sólo actualiza las pantallas cuyos recursos fueron afectados", async ({
  page,
}) => {
  let consultasAlertas = 0;
  await page.route("**/api/**", async (route) => {
    const ruta = new URL(route.request().url()).pathname;
    if (ruta.endsWith("/auth/sesion"))
      return json(route, 200, { usuario: administradora });
    if (ruta.endsWith("/alertas")) {
      consultasAlertas += 1;
      return json(route, 200, {
        actualizadoEn: new Date().toISOString(),
        totales: {
          bajoInventario: 0,
          clientesVencidos: 0,
          pedidosAtrasados: 0,
          rutasIncompletas: 0,
          total: 0,
        },
        productos: [],
        clientes: [],
        pedidos: [],
        rutas: [],
      });
    }
    return json(route, 404, {
      error: { codigo: "NO_MOCK", mensaje: `Sin mock para ${ruta}` },
    });
  });

  await page.goto("/alertas");
  await expect(page.getByText(/No hay alertas activas/)).toBeVisible();
  await expect.poll(() => consultasAlertas).toBeGreaterThan(0);
  await page.waitForTimeout(150);
  const iniciales = consultasAlertas;

  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("nexo:datos-cambiaron", {
        detail: {
          metodo: "PATCH",
          ruta: "/usuarios/otro",
          ocurridoEn: Date.now(),
          recursos: ["usuarios"],
        },
      }),
    ),
  );
  await page.waitForTimeout(200);
  expect(consultasAlertas).toBe(iniciales);

  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("nexo:datos-cambiaron", {
        detail: {
          metodo: "POST",
          ruta: "/ventas",
          ocurridoEn: Date.now(),
          recursos: ["alertas", "ventas"],
        },
      }),
    ),
  );
  await expect.poll(() => consultasAlertas).toBeGreaterThan(iniciales);
});

test("normaliza errores con X-Request-Id y combina cancelación externa", async () => {
  const fetchOriginal = globalThis.fetch;
  let solicitudRecibida = "";
  globalThis.fetch = async (_entrada, opciones) => {
    solicitudRecibida =
      new Headers(opciones?.headers).get("X-Request-Id") ?? "";
    return new Response(
      JSON.stringify({
        error: { codigo: "SERVICIO_OCUPADO", mensaje: "Intenta nuevamente" },
      }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json",
          "X-Request-Id": "servidor-prueba-1234",
        },
      },
    );
  };
  try {
    const error = await api("/prueba-correlacion-unica").catch(
      (fallo: unknown) => fallo,
    );
    expect(error).toBeInstanceOf(ErrorApi);
    expect(error).toMatchObject({
      codigo: "SERVICIO_OCUPADO",
      estado: 503,
      solicitudId: "servidor-prueba-1234",
    });
    expect(solicitudRecibida).toMatch(/^[A-Za-z0-9._:-]{8,128}$/);
  } finally {
    globalThis.fetch = fetchOriginal;
  }

  globalThis.fetch = async (_entrada, opciones) =>
    new Promise<Response>((_resolver, rechazar) => {
      opciones?.signal?.addEventListener(
        "abort",
        () => rechazar(new DOMException("Tiempo agotado", "AbortError")),
        { once: true },
      );
    });
  try {
    const error = await api("/prueba-timeout-unica", {
      tiempoMaximoMs: 10,
    }).catch((fallo: unknown) => fallo);
    expect(error).toBeInstanceOf(ErrorApi);
    expect(error).toMatchObject({ codigo: "TIEMPO_AGOTADO", estado: 408 });
  } finally {
    globalThis.fetch = fetchOriginal;
  }

  const controlador = new AbortController();
  globalThis.fetch = async (_entrada, opciones) =>
    new Promise<Response>((_resolver, rechazar) => {
      opciones?.signal?.addEventListener(
        "abort",
        () => rechazar(new DOMException("Cancelada", "AbortError")),
        { once: true },
      );
    });
  try {
    const solicitud = api("/prueba-cancelacion-unica", {
      signal: controlador.signal,
      tiempoMaximoMs: 2_000,
    });
    controlador.abort();
    const error = await solicitud.catch((fallo: unknown) => fallo);
    expect(error).toBeInstanceOf(ErrorApi);
    expect(error).toMatchObject({ codigo: "SOLICITUD_CANCELADA", estado: 0 });
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});
