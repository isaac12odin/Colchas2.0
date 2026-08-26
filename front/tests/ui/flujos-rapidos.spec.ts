import { expect, test, type Page, type Route } from "@playwright/test";

const usuarioAdministrador = {
  id: "00000000-0000-4000-8000-000000000001",
  nombre: "Administradora UX",
  correo: "admin-ux@nexo.test",
  rol: "ADMINISTRADOR",
  debeCambiarContrasena: false,
  mfaHabilitado: true,
};

const cliente = {
  id: "10000000-0000-4000-8000-000000000001",
  nombreCompleto: "María Saldo Visible",
  telefono: "2221234567",
  direccion: "Calle Reforma 42",
  numeroTarjeta: "UI-0042",
  localidad: { nombre: "San Miguel", estado: "Puebla" },
  saldo: { saldoActual: "200", vencidoActual: "0" },
  evaluacionesRiesgo: [],
};

const producto = {
  id: "20000000-0000-4000-8000-000000000001",
  sku: "COL-UI-01",
  nombre: "Colcha matrimonial azul",
  marca: "Vektra Hogar",
  categoriaId: "21000000-0000-4000-8000-000000000001",
  categoria: "Colcha",
  codigoBarras: "750000000001",
  existencia: 8,
  precioVenta: "400",
  precioCompra: "200",
  tieneFoto: false,
  fotoActualizadaEn: null,
};

const paginaVacia = {
  datos: [],
  paginacion: { pagina: 1, limite: 20, total: 0, totalPaginas: 0 },
};

async function json(route: Route, estado: number, cuerpo: unknown) {
  await route.fulfill({
    status: estado,
    contentType: "application/json",
    body: JSON.stringify(cuerpo),
  });
}

async function prepararSesion(
  page: Page,
  responder: (route: Route, ruta: string) => Promise<boolean>,
) {
  await page.route("**/api/**", async (route) => {
    const ruta = new URL(route.request().url()).pathname;
    if (ruta.endsWith("/auth/sesion")) {
      await json(route, 200, { usuario: usuarioAdministrador });
      return;
    }
    if (ruta.endsWith("/alertas")) {
      await json(route, 200, { totales: { total: 0 } });
      return;
    }
    if (await responder(route, ruta)) return;
    await json(route, 404, {
      error: { codigo: "NO_MOCK", mensaje: `Sin mock para ${ruta}` },
    });
  });
}

test("registra una venta a crédito en 3 pasos y confirma el saldo resultante", async ({
  page,
}) => {
  let cuerpoVenta: Record<string, unknown> | null = null;
  await prepararSesion(page, async (route, ruta) => {
    if (ruta.endsWith("/ventas") && route.request().method() === "POST") {
      cuerpoVenta = route.request().postDataJSON();
      await json(route, 201, {
        id: "30000000-0000-4000-8000-000000000001",
        folio: "V-UX-001",
        total: "800",
        idempotente: false,
        resumenSaldo: {
          clienteId: cliente.id,
          saldoAnterior: 200,
          cargoVenta: 800,
          anticipo: 100,
          saldoNuevo: 900,
        },
      });
      return true;
    }
    if (ruta.endsWith("/ventas")) {
      await json(route, 200, paginaVacia);
      return true;
    }
    if (ruta.endsWith("/clientes")) {
      await json(route, 200, {
        datos: [cliente],
        paginacion: { ...paginaVacia.paginacion, total: 1, totalPaginas: 1 },
      });
      return true;
    }
    if (ruta.endsWith("/inventario/productos")) {
      await json(route, 200, {
        datos: [producto],
        paginacion: { ...paginaVacia.paginacion, total: 1, totalPaginas: 1 },
      });
      return true;
    }
    if (ruta.endsWith("/inventario/catalogos-producto")) {
      await json(route, 200, {
        marcas: ["Vektra Hogar"],
        categorias: [{ id: producto.categoriaId, nombre: "Colcha" }],
      });
      return true;
    }
    return false;
  });

  await page.goto("/ventas");
  await page.getByRole("button", { name: "Nueva venta" }).click();
  await expect(page.getByText("Paso 1 de 3")).toBeVisible();
  await page.getByRole("button", { name: /Venta a crédito/ }).click();

  await expect(page.getByText("Paso 2 de 3")).toBeVisible();
  await page.getByRole("button", { name: /María Saldo Visible/ }).click();
  await page.getByRole("button", { name: /Colcha matrimonial azul/ }).click();
  await page.getByRole("button", { name: "Sumar" }).click();
  await page.getByRole("button", { name: /Revisar venta/ }).click();

  await expect(page.getByText("Paso 3 de 3")).toBeVisible();
  await page.getByLabel("Anticipo recibido").fill("100");
  await expect(page.getByText("Saldo después de vender")).toBeVisible();
  await expect(page.getByText("$900.00")).toBeVisible();
  await page.getByRole("button", { name: "Confirmar venta" }).click();

  await expect(page.getByText("Saldo actualizado correctamente")).toBeVisible();
  await expect(page.getByText("Ahora debe")).toBeVisible();
  await expect(page.getByText("$900.00")).toBeVisible();
  expect(cuerpoVenta).toMatchObject({
    clienteId: cliente.id,
    tipo: "CREDITO",
    anticipo: 100,
    items: [{ productoId: producto.id, cantidad: 2 }],
    plan: { periodicidad: "SEMANAL" },
  });
  await page.getByRole("button", { name: "Registrar otra" }).click();
  await expect(page.getByText("Paso 1 de 3")).toBeVisible();
});

test("una venta adicional conserva el abono vigente y extiende el calendario", async ({
  page,
}) => {
  const clienteConAcuerdo = {
    ...cliente,
    acuerdoPago: {
      periodicidad: "SEMANAL",
      montoPeriodico: "100",
      activo: true,
    },
  };
  await prepararSesion(page, async (route, ruta) => {
    if (ruta.endsWith("/ventas")) {
      await json(route, 200, paginaVacia);
      return true;
    }
    if (ruta.endsWith("/clientes")) {
      await json(route, 200, {
        datos: [clienteConAcuerdo],
        paginacion: { ...paginaVacia.paginacion, total: 1, totalPaginas: 1 },
      });
      return true;
    }
    if (ruta.endsWith("/inventario/productos")) {
      await json(route, 200, {
        datos: [producto],
        paginacion: { ...paginaVacia.paginacion, total: 1, totalPaginas: 1 },
      });
      return true;
    }
    return false;
  });

  await page.goto("/ventas");
  await page.getByRole("button", { name: "Nueva venta" }).click();
  await page.getByRole("button", { name: /Venta a crédito/ }).click();
  await page.getByRole("button", { name: /María Saldo Visible/ }).click();
  await page.getByRole("button", { name: /Colcha matrimonial azul/ }).click();
  await page.getByRole("button", { name: /Revisar venta/ }).click();

  await expect(page.getByText("Se respeta el acuerdo actual")).toBeVisible();
  await expect(page.getByLabel("Frecuencia")).toBeDisabled();
  await expect(page.getByLabel("Cuánto pagará")).toHaveValue("100");
  await expect(page.getByLabel("Cuánto pagará")).toHaveAttribute(
    "readonly",
    "",
  );
  await expect(
    page.getByText(/después del último compromiso pendiente/),
  ).toBeVisible();
});

test("el administrador conserva el abono directo como excepción contable", async ({
  page,
}) => {
  let cuerpoAbono: Record<string, unknown> | null = null;
  await prepararSesion(page, async (route, ruta) => {
    if (ruta.endsWith("/abonos") && route.request().method() === "POST") {
      cuerpoAbono = route.request().postDataJSON();
      await json(route, 201, {
        id: "40000000-0000-4000-8000-000000000001",
        saldoAnterior: 200,
        saldoNuevo: 50,
      });
      return true;
    }
    if (ruta.endsWith("/clientes")) {
      await json(route, 200, {
        datos: [cliente],
        paginacion: { ...paginaVacia.paginacion, total: 1, totalPaginas: 1 },
      });
      return true;
    }
    if (ruta.endsWith("/localidades")) {
      await json(route, 200, { datos: [cliente.localidad] });
      return true;
    }
    return false;
  });

  await page.goto("/clientes");
  await page
    .getByRole("button", { name: "Abono directo", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: /María Saldo Visible/ }).click();
  await page.getByLabel("Monto recibido").fill("150");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Registrar abono" })
    .click();

  await expect(page.getByText("Abono registrado")).toBeVisible();
  await expect(page.getByText("$50.00")).toBeVisible();
  expect(cuerpoAbono).toMatchObject({
    clienteId: cliente.id,
    monto: 150,
    metodo: "EFECTIVO",
  });
});

test("la compra obliga a revisar existencias antes de registrar la entrada", async ({
  page,
}) => {
  const proveedor = {
    id: "50000000-0000-4000-8000-000000000001",
    nombre: "Textiles del Centro",
    contacto: null,
    telefono: null,
    correo: null,
    rfc: null,
    notas: null,
    activo: true,
    _count: { compras: 0, itemsPedido: 0 },
  };
  let cuerpoCompra: Record<string, unknown> | null = null;
  await prepararSesion(page, async (route, ruta) => {
    if (ruta.endsWith("/compras") && route.request().method() === "POST") {
      cuerpoCompra = route.request().postDataJSON();
      await json(route, 201, { id: "compra-guiada-1", folio: "C-GUIADA-1" });
      return true;
    }
    if (ruta.endsWith("/compras")) {
      await json(route, 200, paginaVacia);
      return true;
    }
    if (ruta.endsWith("/proveedores")) {
      await json(route, 200, { datos: [proveedor] });
      return true;
    }
    if (ruta.endsWith("/pedidos")) {
      await json(route, 200, { datos: [] });
      return true;
    }
    if (ruta.endsWith("/inventario/productos")) {
      await json(route, 200, {
        datos: [producto],
        paginacion: { ...paginaVacia.paginacion, total: 1, totalPaginas: 1 },
      });
      return true;
    }
    return false;
  });

  await page.goto("/compras");
  await page.getByRole("button", { name: "Registrar entrada" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByLabel("Proveedor que surtió").selectOption(proveedor.id);
  await dialogo
    .locator('[data-capacitacion="compras.compra.continuar-1"]')
    .click();
  await dialogo
    .getByRole("button", { name: /Colcha matrimonial azul/ })
    .click();
  await dialogo.getByLabel("Piezas recibidas").fill("5");
  await dialogo.getByLabel("Costo por pieza").fill("210");
  await expect(dialogo.getByText("8 → 13")).toBeVisible();
  expect(cuerpoCompra).toBeNull();

  await dialogo
    .locator('[data-capacitacion="compras.compra.continuar-2"]')
    .click();
  await expect(
    dialogo.getByText("Revisa antes de mover inventario"),
  ).toBeVisible();
  await expect(
    dialogo.getByText(/No se crea una venta ni deuda/),
  ).toBeVisible();
  expect(cuerpoCompra).toBeNull();

  await dialogo
    .getByRole("button", { name: "Registrar compra y sumar existencias" })
    .click();
  expect(cuerpoCompra).toMatchObject({
    proveedorId: proveedor.id,
    items: [{ productoId: producto.id, cantidad: 5, costoUnitario: 210 }],
  });
});

test("el inventario permite subir y enviar una fotografía optimizada", async ({
  page,
}) => {
  let cuerpoProducto: Record<string, unknown> | null = null;
  await prepararSesion(page, async (route, ruta) => {
    if (
      ruta.endsWith("/inventario/productos") &&
      route.request().method() === "POST"
    ) {
      cuerpoProducto = route.request().postDataJSON();
      await json(route, 201, {
        ...producto,
        id: "20000000-0000-4000-8000-000000000099",
        tieneFoto: true,
      });
      return true;
    }
    if (ruta.endsWith("/inventario/productos")) {
      await json(route, 200, paginaVacia);
      return true;
    }
    if (ruta.endsWith("/inventario/catalogos-producto")) {
      await json(route, 200, {
        marcas: ["Vektra Hogar"],
        categorias: [{ id: producto.categoriaId, nombre: "Colcha" }],
      });
      return true;
    }
    return false;
  });

  await page.goto("/inventario");
  await page.getByRole("button", { name: "Nuevo producto" }).click();
  await page.getByLabel("Fotografía del producto").setInputFiles({
    name: "colcha.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(page.getByAltText("Vista previa del producto")).toBeVisible();
  await page.getByLabel("Nombre del producto").fill("Colcha con fotografía");
  await page
    .getByLabel("Agrupación del catálogo")
    .selectOption(producto.categoriaId);
  await page.getByLabel("Marca").fill("Vektra Hogar");
  await page.getByLabel("SKU").fill("FOTO-001");
  await page
    .locator('[data-capacitacion="inventario.producto.continuar-1"]')
    .click();
  await page.getByLabel("Costo de compra por pieza").fill("200");
  await page.getByLabel("Precio autorizado de venta").fill("400");
  await page
    .locator('[data-capacitacion="inventario.producto.continuar-2"]')
    .click();
  await page
    .locator('[data-capacitacion="inventario.producto.guardar"]')
    .click();

  expect(cuerpoProducto).toMatchObject({
    nombre: "Colcha con fotografía",
    categoriaId: producto.categoriaId,
    foto: { nombre: "colcha.webp", mime: "image/webp" },
  });
  expect(
    (cuerpoProducto as { foto?: { base64?: string } } | null)?.foto?.base64
      ?.length,
  ).toBeGreaterThan(20);
});
