import { expect, test, type Page, type Route } from "@playwright/test";

const usuario = {
  id: "usuario-ux-movil",
  nombre: "Administración UX",
  correo: "ux-movil@vektra.test",
  rol: "ADMINISTRADOR",
  debeCambiarContrasena: false,
  mfaHabilitado: true,
};

const cliente = {
  id: "cliente-ux-movil",
  nombreCompleto: "María Fácil de Cobrar",
  telefono: "222 555 0101",
  direccion: "Avenida Reforma 42, colonia Centro",
  numeroTarjeta: "0042",
  localidad: { id: "localidad-ux", nombre: "Centro", estado: "Puebla" },
  saldo: { saldoActual: "850", vencidoActual: "0" },
  evaluacionesRiesgo: [{ nivel: "BAJO", puntuacion: 5 }],
};

const producto = {
  id: "producto-ux-movil",
  nombre: "Colcha azul matrimonial",
  marca: "Vektra Hogar",
  sku: "COL-AZ-01",
  codigoBarras: "7501234567890",
  existencia: 8,
  precioVenta: "1200",
  precioCompra: "600",
  tieneFoto: false,
  fotoActualizadaEn: null,
};

const venta = {
  id: "venta-ux-movil",
  folio: "V-UX-MOVIL-001",
  fechaVenta: "2026-09-01T12:00:00.000Z",
  tipo: "CREDITO",
  total: "1200",
  anticipo: "200",
  cliente: { nombreCompleto: cliente.nombreCompleto },
  usuario: { nombre: usuario.nombre },
};

function pagina(datos: unknown[]) {
  return {
    datos,
    paginacion: {
      pagina: 1,
      limite: 15,
      total: datos.length,
      totalPaginas: datos.length ? 1 : 0,
    },
  };
}

async function responder(route: Route, cuerpo: unknown, estado = 200) {
  await route.fulfill({
    status: estado,
    contentType: "application/json",
    body: JSON.stringify(cuerpo),
  });
}

async function preparar(page: Page) {
  let ventasCreadas = 0;
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const ruta = url.pathname;
    if (ruta.endsWith("/auth/sesion")) return responder(route, { usuario });
    if (ruta.endsWith("/alertas"))
      return responder(route, { totales: { total: 0 } });
    if (ruta.endsWith("/localidades"))
      return responder(route, { datos: [cliente.localidad] });
    if (ruta.endsWith("/clientes")) return responder(route, pagina([cliente]));
    if (ruta.endsWith("/ventas") && route.request().method() === "POST") {
      ventasCreadas += 1;
      return responder(route, { id: "nueva", folio: "V-NUEVA" }, 201);
    }
    if (ruta.endsWith("/ventas")) return responder(route, pagina([venta]));
    if (ruta.endsWith("/inventario/productos"))
      return responder(route, pagina([producto]));
    if (ruta.endsWith("/inventario/catalogos-producto"))
      return responder(route, { marcas: [], categorias: [] });
    return responder(
      route,
      { error: { codigo: "NO_MOCK", mensaje: `Sin mock para ${ruta}` } },
      404,
    );
  });
  return { ventasCreadas: () => ventasCreadas };
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
});

test("clientes usa tarjetas legibles con acciones completas en móvil", async ({
  page,
}) => {
  await preparar(page);
  await page.goto("/clientes");

  await expect(page.getByTestId("cliente-tarjeta-movil")).toBeVisible();
  await expect(page.getByRole("table")).toBeHidden();
  await expect(
    page
      .getByTestId("cliente-tarjeta-movil")
      .getByText("María Fácil de Cobrar"),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Llamar a María/ }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Expediente" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Registrar abono" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
});

test("ventas usa tarjetas móviles y el buscador no envía la venta por accidente", async ({
  page,
}) => {
  const estado = await preparar(page);
  await page.goto("/ventas");

  await expect(page.getByTestId("venta-tarjeta-movil")).toBeVisible();
  await expect(page.getByRole("table")).toBeHidden();
  await expect(
    page.getByTestId("venta-tarjeta-movil").getByText("V-UX-MOVIL-001"),
  ).toBeVisible();

  await page.getByRole("button", { name: "Nueva venta" }).click();
  await page.getByRole("button", { name: /Venta a crédito/ }).click();

  const buscarCliente = page.getByPlaceholder(
    "Nombre, teléfono, dirección, tarjeta o localidad",
  );
  await buscarCliente.fill("María Fácil");
  await expect(
    page.getByRole("button", { name: /María Fácil de Cobrar/ }),
  ).toBeVisible();
  await buscarCliente.press("Enter");
  await expect(page.getByText(cliente.telefono)).toBeVisible();

  const buscarProducto = page.getByPlaceholder("Producto, marca, SKU o código");
  await buscarProducto.fill(producto.codigoBarras);
  await expect(
    page.getByRole("button", { name: /Colcha azul matrimonial/ }),
  ).toBeVisible();
  await buscarProducto.press("Enter");

  expect(estado.ventasCreadas()).toBe(0);
  await expect(
    page.getByRole("button", { name: /Revisar venta/ }),
  ).toBeEnabled();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
});
