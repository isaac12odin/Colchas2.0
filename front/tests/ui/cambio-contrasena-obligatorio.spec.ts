import { expect, test, type Route } from "@playwright/test";

const usuarioTemporal = {
  id: "00000000-0000-4000-8000-000000000099",
  nombre: "Administradora Temporal",
  correo: "temporal@nexo.test",
  rol: "ADMINISTRADOR",
  debeCambiarContrasena: true,
  mfaHabilitado: false,
};

test("una clave temporal dirige al formulario real y no consulta módulos", async ({
  page,
}) => {
  const rutasApi: string[] = [];
  await page.route("**/api/**", async (route: Route) => {
    const ruta = new URL(route.request().url()).pathname;
    rutasApi.push(ruta);
    if (ruta.endsWith("/auth/sesion"))
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ usuario: usuarioTemporal }),
      });
    if (
      ruta.endsWith("/auth/cambiar-contrasena") ||
      ruta.endsWith("/auth/cerrar-sesion")
    )
      return route.fulfill({ status: 204 });
    return route.fulfill({
      status: 428,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          codigo: "CAMBIO_CONTRASENA_REQUERIDO",
          mensaje: "Debe reemplazar la contraseña temporal.",
        },
      }),
    });
  });

  await page.goto("/inicio");
  await expect(page).toHaveURL(/\/perfil$/);
  await expect(
    page.getByText("La contraseña que recibiste es temporal"),
  ).toBeVisible();
  expect(rutasApi.filter((ruta) => ruta.endsWith("/alertas"))).toHaveLength(0);

  await page.getByLabel("Contraseña actual").fill("Temporal!2026");
  await page.getByLabel("Nueva contraseña (mínimo 6)").fill("Definitiva!2026");
  await page.getByLabel("Confirmar nueva contraseña").fill("Definitiva!2026");
  await page
    .getByRole("button", { name: "Actualizar y cerrar sesiones" })
    .click();

  await expect(page).toHaveURL(/\/$/);
  expect(
    rutasApi.some((ruta) => ruta.endsWith("/auth/cambiar-contrasena")),
  ).toBe(true);
});
