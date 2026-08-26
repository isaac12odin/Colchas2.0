import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";

async function json(route: Route, cuerpo: unknown, estado = 200) {
  await route.fulfill({
    status: estado,
    contentType: "application/json",
    body: JSON.stringify(cuerpo),
  });
}

async function exigirSinImpactosAltos(page: Page) {
  const resultado = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const graves = resultado.violations.filter((violacion) =>
    ["serious", "critical"].includes(violacion.impact ?? ""),
  );
  expect(graves, JSON.stringify(graves, null, 2)).toEqual([]);
}

test("el acceso no tiene violaciones WCAG graves en claro u oscuro", async ({
  page,
}) => {
  await page.route("**/api/**", async (route) => {
    const ruta = new URL(route.request().url()).pathname;
    if (ruta.endsWith("/auth/sesion"))
      return json(route, { error: { mensaje: "Sin sesión" } }, 401);
    return json(route, { error: { mensaje: `Sin mock para ${ruta}` } }, 404);
  });
  await page.goto("/");
  await exigirSinImpactosAltos(page);
  await page.getByRole("button", { name: "Cambiar tema" }).click();
  // Axe debe medir el color final, no un fotograma intermedio de la transición.
  await page.waitForTimeout(300);
  await exigirSinImpactosAltos(page);
});

test("el inicio administrativo no tiene violaciones WCAG graves", async ({
  page,
}) => {
  await page.route("**/api/**", async (route) => {
    const ruta = new URL(route.request().url()).pathname;
    if (ruta.endsWith("/auth/sesion"))
      return json(route, {
        usuario: {
          id: "00000000-0000-4000-8000-000000000098",
          nombre: "Administración Accesible",
          correo: "accesible@nexo.test",
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
  await exigirSinImpactosAltos(page);
});
