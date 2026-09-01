import { expect, type Route, test } from "@playwright/test";

const producto = {
  id: "b1000000-0000-4000-8000-000000000001",
  nombre: "Colcha king size edición familiar",
  marca: "Vektra Hogar",
  sku: "COL-KING-FAM",
  categoriaId: "b2000000-0000-4000-8000-000000000001",
  categoria: "Colchas",
  codigoBarras: null,
  codigoQr: null,
  existencia: 4,
  existenciaMinima: 1,
  precioCompra: "800",
  precioVenta: "1400",
  activo: true,
  tieneFoto: false,
  fotoActualizadaEn: null,
};

async function responder(route: Route, cuerpo: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(cuerpo),
  });
}

test("inventario y sus acciones permanecen utilizables a 320 px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const ruta = url.pathname;
    if (ruta.endsWith("/auth/sesion"))
      return responder(route, {
        usuario: {
          id: "admin-responsive",
          nombre: "Administradora Responsive",
          correo: "responsive@nexo.test",
          rol: "ADMINISTRADOR",
          debeCambiarContrasena: false,
          mfaHabilitado: true,
        },
      });
    if (ruta.endsWith("/alertas"))
      return responder(route, { totales: { total: 0 } });
    if (ruta.endsWith("/inventario/catalogos-producto"))
      return responder(route, {
        marcas: [producto.marca],
        categorias: [{ id: producto.categoriaId, nombre: producto.categoria }],
      });
    if (ruta.endsWith("/inventario/productos"))
      return responder(route, {
        datos: [producto],
        paginacion: {
          pagina: 1,
          limite: 18,
          total: 1,
          totalPaginas: 1,
        },
      });
    return route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ error: { mensaje: `Sin mock para ${ruta}` } }),
    });
  });

  await page.goto("/inventario");
  await page.getByText("Guía rápida de inventario").click();
  await expect(page.getByText("El conteo no coincide")).toBeVisible();
  await page
    .getByRole("button", {
      name: `Ajustar existencia de ${producto.nombre}`,
    })
    .click();

  const dialogo = page.getByRole("dialog");
  await expect(dialogo.getByRole("button", { name: "Agregar" })).toBeVisible();
  await expect(dialogo.getByRole("button", { name: "Retirar" })).toBeVisible();
  await expect(dialogo.getByLabel("Piezas")).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const caja = await dialogo.boundingBox();
  expect(caja?.width ?? 999).toBeLessThanOrEqual(320);
});
