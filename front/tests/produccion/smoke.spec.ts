import { expect, test, type Route } from "@playwright/test";

const administradora = {
  id: "smoke-produccion-admin",
  nombre: "Administradora Producción",
  correo: "produccion@nexo.test",
  rol: "ADMINISTRADOR",
  debeCambiarContrasena: false,
  mfaHabilitado: true,
};

async function json(route: Route, cuerpo: unknown, estado = 200) {
  await route.fulfill({
    status: estado,
    contentType: "application/json",
    body: JSON.stringify(cuerpo),
  });
}

test("el artefacto productivo permite iniciar sesión y abrir el panel", async ({
  page,
}) => {
  await page.route("**/api/**", async (route) => {
    const ruta = new URL(route.request().url()).pathname;
    if (ruta.endsWith("/auth/sesion") || ruta.endsWith("/auth/renovar"))
      return json(
        route,
        { error: { codigo: "NO_AUTENTICADO", mensaje: "Sin sesión" } },
        401,
      );
    if (ruta.endsWith("/auth/iniciar-sesion"))
      return json(route, { usuario: administradora });
    if (ruta.endsWith("/alertas"))
      return json(route, { totales: { total: 0 } });
    if (ruta.endsWith("/reportes/resumen"))
      return json(route, {
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
    return json(
      route,
      { error: { codigo: "NO_MOCK", mensaje: `Sin mock para ${ruta}` } },
      404,
    );
  });

  const documento = await page.goto("/");
  expect(documento?.headers()["x-powered-by"]).toBeUndefined();
  const politicaContenido = documento?.headers()["content-security-policy"];
  expect(politicaContenido).toContain("default-src 'self'");
  expect(politicaContenido).toContain("upgrade-insecure-requests");
  expect(politicaContenido).not.toContain("'unsafe-eval'");

  await page.getByLabel("Correo electrónico").fill(administradora.correo);
  await page.getByLabel("Contraseña").fill("Produccion!2026");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  await expect(page).toHaveURL(/\/inicio$/);
  await expect(
    page.getByRole("heading", { name: "¿Qué vas a hacer?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Resumen de operación" }),
  ).toBeVisible();
});
