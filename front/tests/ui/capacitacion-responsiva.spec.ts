import { expect, type Route, test } from "@playwright/test";

async function json(route: Route, cuerpo: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(cuerpo),
  });
}

test("la capacitación es operable en móvil sin desbordamiento", async ({
  page,
}) => {
  await page.route("**/api/**", async (route) => {
    const ruta = new URL(route.request().url()).pathname;
    if (ruta.endsWith("/auth/sesion"))
      return json(route, {
        usuario: {
          id: "capacitacion-responsive",
          nombre: "Administradora de capacitación",
          correo: "cobradora@nexo.test",
          rol: "ADMINISTRADOR",
          debeCambiarContrasena: false,
          mfaHabilitado: false,
        },
      });
    if (ruta.endsWith("/pedidos") || ruta.endsWith("/proveedores/opciones"))
      return json(route, { datos: [] });
    return json(route, { totales: { total: 0 } });
  });

  await page.goto("/capacitacion?pantalla=pedidos");
  await expect(page.getByTestId("centro-capacitacion")).toBeVisible();
  await page.getByTestId("selector-rol-capacitacion").selectOption("COBRADOR");
  await expect(page.getByText("Entregar pedido y generar venta")).toBeVisible();
  await expect(page.getByText("Asignar quién surtirá")).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveCSS("overflow-x", "scroll");

  const boton = page
    .getByRole("button", { name: "Practicar en la pantalla real" })
    .first();
  await boton.scrollIntoViewIfNeeded();
  await expect(boton).toBeInViewport();
  await boton.click();
  await expect(page).toHaveURL(/\/pedidos\?practica=/);
  await expect(page.getByRole("heading", { name: "Pedidos" })).toBeVisible();
  const entrenador = page.getByTestId("entrenador-pantalla-real");
  await expect(entrenador).toBeVisible();
  await expect(entrenador).toBeInViewport();
  await expect(entrenador).toContainText("MICROEJEMPLO · NO LO COPIES");
  expect(
    await page
      .getByTestId("layout-practica-sin-traslape")
      .evaluate((layout) => {
        const guia = layout.querySelector<HTMLElement>(
          '[data-testid="entrenador-pantalla-real"]',
        );
        const modulo = layout.querySelector<HTMLElement>(
          "main[data-pantalla-operativa]",
        );
        if (!guia || !modulo) return false;
        const a = guia.getBoundingClientRect();
        const b = modulo.getBoundingClientRect();
        return (
          a.right <= b.left ||
          b.right <= a.left ||
          a.bottom <= b.top ||
          b.bottom <= a.top
        );
      }),
  ).toBe(true);
  await expect(
    entrenador.getByRole("button", { name: "Salir de la práctica" }),
  ).toBeInViewport();
});
