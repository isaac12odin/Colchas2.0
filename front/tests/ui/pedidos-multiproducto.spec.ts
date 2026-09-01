import { expect, test, type Page, type Route } from "@playwright/test";

const administrador = {
  id: "b1000000-0000-4000-8000-000000000001",
  nombre: "Administradora Pedidos",
  correo: "pedidos-multiples@nexo.test",
  rol: "ADMINISTRADOR",
  debeCambiarContrasena: false,
  mfaHabilitado: true,
};

const cliente = {
  id: "b2000000-0000-4000-8000-000000000001",
  nombreCompleto: "María Multi Producto",
  telefono: "2221234567",
  direccion: "Calle Pedido 20",
  numeroTarjeta: "MULTI-20",
  localidad: { nombre: "Centro", estado: "Puebla" },
  saldo: { saldoActual: "0", vencidoActual: "0" },
};

const productos = [
  {
    id: "b3000000-0000-4000-8000-000000000001",
    nombre: "Colcha matrimonial azul",
    marca: "Vektra",
    sku: "COL-AZ-01",
    codigoBarras: "750000000001",
    existencia: 0,
    precioVenta: "900",
    precioCompra: "500",
    tieneFoto: false,
    fotoActualizadaEn: null,
  },
  {
    id: "b3000000-0000-4000-8000-000000000002",
    nombre: "Edredón individual gris",
    marca: "Vektra",
    sku: "EDR-GR-02",
    codigoBarras: "750000000002",
    existencia: 2,
    precioVenta: "600",
    precioCompra: "350",
    tieneFoto: false,
    fotoActualizadaEn: null,
  },
];

function pagina<T>(datos: T[]) {
  return {
    datos,
    paginacion: {
      pagina: 1,
      limite: 20,
      total: datos.length,
      totalPaginas: 1,
    },
  };
}

async function json(route: Route, cuerpo: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(cuerpo),
  });
}

async function prepararPedidos(
  page: Page,
  alCrear: (cuerpo: Record<string, unknown>) => Promise<void> | void,
) {
  await page.route("**/api/**", async (route) => {
    const solicitud = route.request();
    const ruta = new URL(solicitud.url()).pathname;
    if (ruta.endsWith("/auth/sesion"))
      return json(route, { usuario: administrador });
    if (ruta.endsWith("/alertas"))
      return json(route, { totales: { total: 0 } });
    if (ruta.endsWith("/clientes")) return json(route, pagina([cliente]));
    if (ruta.endsWith("/inventario/productos") && solicitud.method() === "GET")
      return json(route, pagina(productos));
    if (ruta.endsWith("/inventario/catalogos-producto"))
      return json(route, { marcas: ["Vektra"], categorias: [] });
    if (ruta.endsWith("/proveedores/opciones"))
      return json(route, { datos: [] });
    if (ruta.endsWith("/pedidos") && solicitud.method() === "GET")
      return json(route, pagina([]));
    if (ruta.endsWith("/pedidos") && solicitud.method() === "POST") {
      await alCrear(solicitud.postDataJSON());
      return json(route, { id: "b4000000-0000-4000-8000-000000000001" }, 201);
    }
    return json(
      route,
      {
        error: { mensaje: `Solicitud sin mock: ${solicitud.method()} ${ruta}` },
      },
      404,
    );
  });
}

async function llegarAProductos(page: Page) {
  await page.goto("/pedidos?accion=nuevo");
  const dialogo = page.getByRole("dialog");
  await dialogo
    .locator('[data-capacitacion="pedidos.cliente.opcion"]')
    .filter({ hasText: cliente.nombreCompleto })
    .click();
  await dialogo
    .locator('[data-capacitacion="pedidos.nuevo.continuar-1"]')
    .click();
  return dialogo;
}

test("crea un pedido con varios productos y fusiona una selección repetida", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  const cuerpos: Record<string, unknown>[] = [];
  await prepararPedidos(page, (cuerpo) => {
    cuerpos.push(cuerpo);
  });
  const dialogo = await llegarAProductos(page);

  const opciones = dialogo.locator(
    '[data-capacitacion="pedidos.producto.opcion"]',
  );
  await opciones.filter({ hasText: productos[0].nombre }).click();
  await expect(
    dialogo.getByTestId(`linea-pedido-${productos[0].id}`),
  ).toHaveCount(1);
  await opciones.filter({ hasText: productos[0].nombre }).click();
  await expect(
    dialogo.getByRole("spinbutton", {
      name: `Cantidad de ${productos[0].nombre}`,
    }),
  ).toHaveValue("2");
  await dialogo
    .getByRole("spinbutton", {
      name: `Cantidad de ${productos[0].nombre}`,
    })
    .fill("3");

  await opciones.filter({ hasText: productos[1].nombre }).click();
  await dialogo
    .getByLabel(`Aumentar cantidad de ${productos[1].nombre}`)
    .click();
  await expect(dialogo.getByText("$3,900.00")).toBeVisible();
  expect(cuerpos).toHaveLength(0);

  const sinDesborde = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
  expect(sinDesborde).toBe(true);

  await dialogo
    .locator('[data-capacitacion="pedidos.nuevo.continuar-2"]')
    .click();
  await expect(dialogo.getByText("3 × Colcha matrimonial azul")).toBeVisible();
  await expect(dialogo.getByText("2 × Edredón individual gris")).toBeVisible();
  const guardar = dialogo.getByRole("button", {
    name: "Crear pedido pendiente de proveedor",
  });
  await dialogo
    .getByLabel("Fecha prometida al cliente (opcional)")
    .fill("2000-01-01");
  await expect(
    dialogo.getByText("La fecha prometida no puede quedar en el pasado."),
  ).toBeVisible();
  await expect(guardar).toBeDisabled();
  await dialogo.getByLabel("Fecha prometida al cliente (opcional)").fill("");
  await expect(guardar).toBeEnabled();
  await guardar.click();

  await expect.poll(() => cuerpos.length).toBe(1);
  expect(cuerpos[0]).toMatchObject({
    clienteId: cliente.id,
    items: [
      { productoId: productos[0].id, cantidad: 3 },
      { productoId: productos[1].id, cantidad: 2 },
    ],
  });
});

test("no permite enviar un pedido vacío ni conserva duplicados", async ({
  page,
}) => {
  let envios = 0;
  await prepararPedidos(page, () => {
    envios += 1;
  });
  const dialogo = await llegarAProductos(page);
  const continuar = dialogo.locator(
    '[data-capacitacion="pedidos.nuevo.continuar-2"]',
  );
  await expect(continuar).toBeDisabled();
  await expect(
    dialogo.getByText(
      "Todavía no agregas productos. Selecciona uno arriba para continuar.",
    ),
  ).toBeVisible();

  const opcion = dialogo
    .locator('[data-capacitacion="pedidos.producto.opcion"]')
    .filter({ hasText: productos[0].nombre });
  await opcion.click();
  await opcion.click();
  await expect(
    dialogo.getByTestId(`linea-pedido-${productos[0].id}`),
  ).toHaveCount(1);
  await dialogo.getByLabel(`Quitar ${productos[0].nombre}`).click();
  await expect(continuar).toBeDisabled();
  expect(envios).toBe(0);
});
