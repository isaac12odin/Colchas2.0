import { expect, test, type Page, type Route } from "@playwright/test";

const usuarioAdministrador = {
  id: "00000000-0000-4000-8000-000000000001",
  nombre: "Administradora E2E",
  correo: "admin-ui@nexo.test",
  rol: "ADMINISTRADOR",
  debeCambiarContrasena: false,
  mfaHabilitado: true,
};

const resumenVacio = {
  periodo: { tipo: "MES", desde: "2026-08-01", hasta: "2026-08-31" },
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
};

async function json(route: Route, estado: number, cuerpo: unknown) {
  await route.fulfill({
    status: estado,
    contentType: "application/json",
    body: JSON.stringify(cuerpo),
  });
}

async function apiSinSesion(page: Page) {
  await page.route("**/api/**", async (route) => {
    const ruta = new URL(route.request().url()).pathname;
    if (ruta.endsWith("/auth/sesion"))
      return json(route, 401, {
        error: { codigo: "NO_AUTENTICADO", mensaje: "Debe iniciar sesión." },
      });
    await json(route, 404, {
      error: { codigo: "NO_MOCK", mensaje: `Sin respuesta para ${ruta}` },
    });
  });
}

test("muestra un error comprensible cuando las credenciales fallan", async ({
  page,
}) => {
  await page.route("**/api/**", async (route) => {
    const ruta = new URL(route.request().url()).pathname;
    if (ruta.endsWith("/auth/sesion"))
      return json(route, 401, { error: { mensaje: "Debe iniciar sesión." } });
    if (ruta.endsWith("/auth/iniciar-sesion"))
      return json(route, 401, {
        error: {
          codigo: "CREDENCIALES_INVALIDAS",
          mensaje: "Correo o contraseña incorrectos.",
        },
      });
    return json(route, 404, { error: { mensaje: "Ruta inesperada" } });
  });

  await page.goto("/");
  const campoContrasena = page.getByLabel("Contraseña");
  await expect(campoContrasena).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Mostrar clave" }).click();
  await expect(campoContrasena).toHaveAttribute("type", "text");
  await page.getByLabel("Correo electrónico").fill("invalido@nexo.test");
  await campoContrasena.fill("Equivocada!2026");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(
    page.locator('[role="alert"]').filter({
      hasText: "Correo o contraseña incorrectos.",
    }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test("inicia sesión, entra al tablero y expone la navegación administrativa", async ({
  page,
}) => {
  await page.route("**/api/**", async (route) => {
    const ruta = new URL(route.request().url()).pathname;
    if (ruta.endsWith("/auth/sesion"))
      return json(route, 401, { error: { mensaje: "Sin sesión" } });
    if (ruta.endsWith("/auth/iniciar-sesion"))
      return json(route, 200, { usuario: usuarioAdministrador });
    if (ruta.endsWith("/alertas"))
      return json(route, 200, { totales: { total: 3 } });
    if (ruta.endsWith("/reportes/resumen"))
      return json(route, 200, resumenVacio);
    return json(route, 404, { error: { mensaje: `Sin mock para ${ruta}` } });
  });

  await page.goto("/");
  await page.getByLabel("Correo electrónico").fill(usuarioAdministrador.correo);
  await page.getByLabel("Contraseña").fill("ValidaUI!2026");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  await expect(page).toHaveURL(/\/inicio$/);
  await expect(
    page.getByRole("heading", { name: "Resumen de operación" }),
  ).toBeVisible();
  await page
    .locator("aside")
    .getByText("Más herramientas", { exact: true })
    .click();
  await expect(
    page.locator("aside").getByRole("link", { name: "Usuarios" }),
  ).toBeVisible();
  await expect(
    page.locator("header").getByRole("link", { name: "Alertas" }),
  ).toContainText("3");
});

test("cierra la sesión web de almacén y dirige a la aplicación móvil", async ({
  page,
}) => {
  const almacenista = {
    ...usuarioAdministrador,
    id: "00000000-0000-4000-8000-000000000002",
    nombre: "Almacenista E2E",
    correo: "almacen-ui@nexo.test",
    rol: "ALMACENISTA",
    mfaHabilitado: false,
  };
  await page.route("**/api/**", async (route) => {
    const ruta = new URL(route.request().url()).pathname;
    if (ruta.endsWith("/auth/sesion"))
      return json(route, 200, { usuario: almacenista });
    if (ruta.endsWith("/alertas"))
      return json(route, 200, { totales: { total: 0 } });
    return json(route, 404, { error: { mensaje: `Sin mock para ${ruta}` } });
  });

  await page.goto("/usuarios");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByLabel("Correo electrónico")).toBeVisible();
  await expect(page.locator("aside")).toHaveCount(0);
});

test("conserva tema e idioma entre recargas", async ({ page }) => {
  await apiSinSesion(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Cambiar idioma" }).click();
  await page.getByRole("button", { name: "Cambiar tema" }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/dark/);

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveClass(/dark/);
});
