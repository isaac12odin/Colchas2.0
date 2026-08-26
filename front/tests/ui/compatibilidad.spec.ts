import { expect, test, type Route } from "@playwright/test";

async function json(route: Route, cuerpo: unknown, estado = 200) {
  await route.fulfill({
    status: estado,
    contentType: "application/json",
    body: JSON.stringify(cuerpo),
  });
}

test("el acceso funciona con teclado y controles nativos", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const ruta = new URL(route.request().url()).pathname;
    if (ruta.endsWith("/auth/sesion"))
      return json(route, { error: { mensaje: "Sin sesión" } }, 401);
    return json(route, { error: { mensaje: `Sin mock para ${ruta}` } }, 404);
  });

  await page.goto("/");
  await page.getByLabel("Correo electrónico").focus();
  await page.keyboard.type("teclado@nexo.test");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Contraseña")).toBeFocused();
  await page.keyboard.type("Compatible!2026");
  await expect(
    page.getByRole("button", { name: "Iniciar sesión" }),
  ).toBeVisible();
});

test("el tablero administrativo conserva navegación y datos esenciales", async ({
  page,
}) => {
  await page.route("**/api/**", async (route) => {
    const ruta = new URL(route.request().url()).pathname;
    if (ruta.endsWith("/auth/sesion"))
      return json(route, {
        usuario: {
          id: "00000000-0000-4000-8000-000000000099",
          nombre: "Administración Compatible",
          correo: "compatible@nexo.test",
          rol: "ADMINISTRADOR",
          debeCambiarContrasena: false,
          mfaHabilitado: true,
        },
      });
    if (ruta.endsWith("/alertas"))
      return json(route, { totales: { total: 0 } });
    if (ruta.endsWith("/reportes/resumen"))
      return json(route, {
        periodo: { tipo: "MES", desde: "2026-08-01", hasta: "2026-08-31" },
        ventas: { total: 0, bruto: 0, devoluciones: 0, operaciones: 0 },
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
    return json(route, { error: { mensaje: `Sin mock para ${ruta}` } }, 404);
  });

  await page.goto("/inicio");
  await expect(
    page.getByRole("heading", { name: "¿Qué vas a hacer?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Hacer una venta/ }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Resumen de operación" }),
  ).toBeVisible();
});
