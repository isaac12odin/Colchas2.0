import { expect, test, type Route } from "@playwright/test";

const usuario = {
  id: "00000000-0000-4000-8000-000000000088",
  nombre: "Administradora Sincronía",
  correo: "sincronia@nexo.test",
  rol: "ADMINISTRADOR",
  debeCambiarContrasena: false,
  mfaHabilitado: true,
};

async function responderJson(route: Route, cuerpo: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(cuerpo),
  });
}

test("siempre consulta al servidor y una respuesta vieja no pisa la nueva", async ({
  page,
}) => {
  let consultasAlertas = 0;
  const consultas: Array<{ url: string; cacheControl?: string }> = [];

  await page.route("**/api/**", async (route) => {
    const solicitud = route.request();
    const url = new URL(solicitud.url());
    if (url.pathname.endsWith("/auth/sesion"))
      return responderJson(route, { usuario });
    if (url.pathname.endsWith("/alertas")) {
      consultasAlertas += 1;
      const numeroConsulta = consultasAlertas;
      consultas.push({
        url: solicitud.url(),
        cacheControl: solicitud.headers()["cache-control"],
      });
      if (numeroConsulta === 1)
        await new Promise((resolver) => setTimeout(resolver, 350));
      const total = numeroConsulta === 1 ? 1 : 7;
      return responderJson(route, {
        actualizadoEn: new Date().toISOString(),
        totales: {
          bajoInventario: total,
          clientesVencidos: 0,
          pedidosAtrasados: 0,
          rutasIncompletas: 0,
          total,
        },
        productos: [
          {
            id: "producto-sincronia",
            nombre: "Producto recién actualizado",
            sku: "SYNC-001",
            existencia: 1,
            existenciaMinima: 7,
          },
        ],
        clientes: [],
        pedidos: [],
        rutas: [],
      });
    }
    return route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ error: { mensaje: "Ruta no simulada" } }),
    });
  });

  await page.goto("/alertas");
  const inventario = page.locator("section").filter({
    has: page.getByRole("heading", { name: /Inventario bajo/ }),
  });
  await expect(inventario.getByText("7", { exact: true })).toBeVisible();
  await page.waitForTimeout(450);
  await expect(inventario.getByText("7", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/Datos confirmados por el servidor/),
  ).toBeVisible();

  expect(consultas.length).toBeGreaterThanOrEqual(2);
  for (const consulta of consultas) {
    expect(new URL(consulta.url).searchParams.get("__nexo")).toBeTruthy();
    expect(consulta.cacheControl).toBe("no-cache");
  }

  const antesDelCambio = consultasAlertas;
  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent("nexo:datos-cambiaron")),
  );
  await expect.poll(() => consultasAlertas).toBeGreaterThan(antesDelCambio);
});
