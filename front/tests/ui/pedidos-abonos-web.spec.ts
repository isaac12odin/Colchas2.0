import { expect, test, type Page, type Route } from "@playwright/test";

const administrador = {
  id: "90000000-0000-4000-8000-000000000001",
  nombre: "Administradora Pedidos",
  correo: "admin-pedidos@nexo.test",
  rol: "ADMINISTRADOR",
  debeCambiarContrasena: false,
  mfaHabilitado: true,
};
const cliente = {
  id: "91000000-0000-4000-8000-000000000001",
  nombreCompleto: "Clienta con pedido",
  telefono: "2221234567",
  direccion: "Calle Pedido 14",
  numeroTarjeta: "PED-14",
  localidad: { nombre: "Centro", estado: "Puebla" },
  saldo: { saldoActual: "600", vencidoActual: "100" },
  evaluacionesRiesgo: [],
};
const proveedor = {
  id: "92000000-0000-4000-8000-000000000001",
  nombre: "Proveedor de colchas",
};
const categoriaColcha = {
  id: "92500000-0000-4000-8000-000000000001",
  nombre: "Colcha",
};
const pedido = {
  id: "93000000-0000-4000-8000-000000000001",
  folio: "P-PRUEBA-001",
  estado: "PENDIENTE_PEDIR",
  fechaCompromiso: null,
  cliente: {
    id: cliente.id,
    nombreCompleto: cliente.nombreCompleto,
    numeroTarjeta: cliente.numeroTarjeta,
  },
  items: [
    {
      id: "94000000-0000-4000-8000-000000000001",
      descripcion: "Colcha matrimonial azul",
      cantidad: 1,
      precioEstimado: "950",
      producto: {
        id: "95000000-0000-4000-8000-000000000001",
        nombre: "Colcha matrimonial azul",
        sku: "COL-AZ-01",
      },
      proveedor: null,
    },
  ],
};

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

async function json(route: Route, cuerpo: unknown, estado = 200) {
  await route.fulfill({
    status: estado,
    contentType: "application/json",
    body: JSON.stringify(cuerpo),
  });
}

async function rutasBase(
  page: Page,
  extra: (route: Route) => Promise<boolean>,
  usuario: typeof administrador = administrador,
) {
  await page.route("**/api/**", async (route) => {
    if (await extra(route)) return;
    const ruta = new URL(route.request().url()).pathname;
    if (ruta.endsWith("/auth/sesion")) return json(route, { usuario });
    if (ruta.endsWith("/alertas"))
      return json(route, { totales: { total: 0 } });
    if (ruta.endsWith("/proveedores/opciones"))
      return json(route, { datos: [proveedor] });
    return json(route, { error: { mensaje: `Sin mock para ${ruta}` } }, 404);
  });
}

test("Contabilidad asigna proveedor existente pero no da de alta uno nuevo", async ({
  page,
}) => {
  await rutasBase(
    page,
    async (route) => {
      const solicitud = route.request();
      if (
        new URL(solicitud.url()).pathname.endsWith("/pedidos") &&
        solicitud.method() === "GET"
      ) {
        await json(route, { datos: [pedido] });
        return true;
      }
      return false;
    },
    { ...administrador, rol: "CONTABLE", mfaHabilitado: false },
  );

  await page.goto("/pedidos");
  await page.getByRole("button", { name: "Elegir proveedor y pedir" }).click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo.getByRole("combobox")).toBeVisible();
  await expect(
    dialogo.getByRole("button", { name: "Agregar proveedor sin salir" }),
  ).toHaveCount(0);
  await expect(dialogo.getByText(/Contabilidad puede asignar/)).toBeVisible();
});

test("Cobranza no abre pedidos en web porque trabaja desde móvil", async ({
  page,
}) => {
  await rutasBase(
    page,
    async (route) => {
      const solicitud = route.request();
      if (
        new URL(solicitud.url()).pathname.endsWith("/pedidos") &&
        solicitud.method() === "GET"
      ) {
        await json(route, { datos: [pedido] });
        return true;
      }
      return false;
    },
    { ...administrador, rol: "COBRADOR", mfaHabilitado: false },
  );

  await page.goto("/pedidos");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByLabel("Correo electrónico")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Elegir proveedor y pedir" }),
  ).toHaveCount(0);
});

test("un pedido pendiente obliga a elegir proveedor antes de avanzar", async ({
  page,
}) => {
  let cuerpoEstado: Record<string, unknown> | null = null;
  await rutasBase(page, async (route) => {
    const solicitud = route.request();
    const ruta = new URL(solicitud.url()).pathname;
    if (ruta.endsWith("/pedidos") && solicitud.method() === "GET") {
      await json(route, { datos: [pedido] });
      return true;
    }
    if (ruta.endsWith(`/pedidos/${pedido.id}/estado`)) {
      cuerpoEstado = solicitud.postDataJSON();
      await json(route, { ...pedido, estado: "PEDIDO_PROVEEDOR" });
      return true;
    }
    return false;
  });

  await page.goto("/pedidos");
  await page.getByRole("button", { name: "Elegir proveedor y pedir" }).click();
  const dialogo = page.getByRole("dialog");
  await expect(
    dialogo.getByRole("heading", { name: /Pedir a proveedor/ }),
  ).toBeVisible();
  const confirmar = dialogo.getByRole("button", {
    name: "Confirmar pedido al proveedor",
  });
  await expect(confirmar).toBeDisabled();
  await dialogo.getByRole("combobox").selectOption(proveedor.id);
  await confirmar.click();

  expect(cuerpoEstado).toEqual({
    estado: "PEDIDO_PROVEEDOR",
    proveedores: [
      { itemPedidoId: pedido.items[0].id, proveedorId: proveedor.id },
    ],
  });
});

test("el alta completa de producto regresa al pedido sin abandonar la captura", async ({
  page,
}) => {
  const productoCreado = {
    id: "96000000-0000-4000-8000-000000000001",
    sku: "NUEVA-01",
    nombre: "Colcha nueva",
    marca: "Vektra Hogar",
    categoriaId: categoriaColcha.id,
    categoria: categoriaColcha.nombre,
    codigoBarras: null,
    existencia: 0,
    precioVenta: "1200",
    precioCompra: "700",
    tieneFoto: false,
    fotoActualizadaEn: null,
  };
  let pedidoCreado: Record<string, unknown> | null = null;
  await rutasBase(page, async (route) => {
    const solicitud = route.request();
    const url = new URL(solicitud.url());
    const ruta = url.pathname;
    if (ruta.endsWith("/clientes")) {
      await json(route, pagina([cliente]));
      return true;
    }
    if (ruta.endsWith("/inventario/productos")) {
      if (solicitud.method() === "POST") await json(route, productoCreado, 201);
      else await json(route, pagina([]));
      return true;
    }
    if (ruta.endsWith("/inventario/catalogos-producto")) {
      await json(route, {
        marcas: ["Vektra Hogar"],
        categorias: [categoriaColcha],
      });
      return true;
    }
    if (ruta.endsWith("/pedidos") && solicitud.method() === "GET") {
      await json(route, { datos: [] });
      return true;
    }
    if (ruta.endsWith("/pedidos") && solicitud.method() === "POST") {
      pedidoCreado = solicitud.postDataJSON();
      await json(route, { id: pedido.id }, 201);
      return true;
    }
    return false;
  });

  await page.goto("/pedidos?accion=nuevo");
  const dialogo = page.getByRole("dialog");
  await dialogo.getByRole("button", { name: cliente.nombreCompleto }).click();
  await dialogo
    .locator('[data-capacitacion="pedidos.nuevo.continuar-1"]')
    .click();
  await dialogo
    .getByRole("button", {
      name: "No existe: registrar producto",
    })
    .click();
  await dialogo.getByLabel("Nombre del producto").fill("Colcha nueva");
  await dialogo
    .getByLabel("Agrupación del catálogo")
    .selectOption(categoriaColcha.id);
  await dialogo.getByLabel("Marca").fill("Vektra Hogar");
  await dialogo.getByLabel("SKU").fill("NUEVA-01");
  await dialogo
    .locator('[data-capacitacion="inventario.producto.continuar-1"]')
    .click();
  await dialogo.getByLabel("Costo de compra por pieza").fill("700");
  await dialogo.getByLabel("Precio autorizado de venta").fill("1200");
  await dialogo
    .locator('[data-capacitacion="inventario.producto.continuar-2"]')
    .click();
  await dialogo
    .locator('[data-capacitacion="inventario.producto.guardar"]')
    .click();
  await expect(
    dialogo.getByText("Colcha nueva", { exact: true }),
  ).toBeVisible();
  await dialogo
    .locator('[data-capacitacion="pedidos.nuevo.continuar-2"]')
    .click();
  await dialogo
    .getByRole("button", { name: "Crear pedido pendiente de proveedor" })
    .click();

  expect(pedidoCreado).toMatchObject({
    clienteId: cliente.id,
    items: [{ productoId: productoCreado.id, cantidad: 1 }],
  });
});

test("capturar abono muestra los pedidos y abre su acción correspondiente", async ({
  page,
}) => {
  await rutasBase(page, async (route) => {
    const solicitud = route.request();
    const url = new URL(solicitud.url());
    if (url.pathname.endsWith("/clientes")) {
      await json(route, pagina([cliente]));
      return true;
    }
    if (url.pathname.endsWith("/localidades")) {
      await json(route, { datos: [] });
      return true;
    }
    if (url.pathname.endsWith("/pedidos") && solicitud.method() === "GET") {
      await json(route, { datos: [pedido] });
      return true;
    }
    return false;
  });

  await page.goto("/clientes?accion=abono");
  let dialogo = page.getByRole("dialog");
  await dialogo.getByRole("button", { name: cliente.nombreCompleto }).click();
  await expect(dialogo.getByText("1 pedido pendiente")).toBeVisible();
  await expect(dialogo.getByText(pedido.folio)).toBeVisible();
  await dialogo.getByRole("link", { name: /Atender/ }).click();

  await expect(page).toHaveURL(/\/pedidos/);
  dialogo = page.getByRole("dialog");
  await expect(
    dialogo.getByRole("heading", { name: /Pedir a proveedor/ }),
  ).toBeVisible();
});

test("si falla la consulta de pedidos no informa falsamente una lista vacía", async ({
  page,
}) => {
  let consultas = 0;
  await rutasBase(page, async (route) => {
    const solicitud = route.request();
    const url = new URL(solicitud.url());
    if (url.pathname.endsWith("/clientes")) {
      await json(route, pagina([cliente]));
      return true;
    }
    if (url.pathname.endsWith("/localidades")) {
      await json(route, { datos: [] });
      return true;
    }
    if (url.pathname.endsWith("/pedidos") && solicitud.method() === "GET") {
      consultas += 1;
      if (consultas === 1) {
        await json(route, { error: { mensaje: "Falla controlada" } }, 500);
      } else {
        await json(route, { datos: [pedido] });
      }
      return true;
    }
    return false;
  });

  await page.goto("/clientes?accion=abono");
  const dialogo = page.getByRole("dialog");
  await dialogo.getByRole("button", { name: cliente.nombreCompleto }).click();
  await expect(dialogo.getByText("Pedidos no disponibles")).toBeVisible();
  await expect(dialogo.getByText("Sin pedidos pendientes")).toHaveCount(0);
  await dialogo.getByRole("button", { name: "Reintentar consulta" }).click();
  await expect(dialogo.getByText("1 pedido pendiente")).toBeVisible();
});
