import { expect, test } from "@playwright/test";

test("el acceso sigue siendo operable en una pantalla móvil", async ({
  page,
}) => {
  await page.route("**/api/**", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: { mensaje: "Sin sesión" } }),
    }),
  );
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Bienvenido de nuevo" }),
  ).toBeVisible();
  await expect(page.getByLabel("Correo electrónico")).toBeInViewport();
  await expect(page.getByLabel("Contraseña")).toBeInViewport();
  await expect(
    page.getByRole("button", { name: "Iniciar sesión" }),
  ).toBeInViewport();
  await expect(page.locator("main")).not.toHaveCSS("overflow-x", "scroll");
});
