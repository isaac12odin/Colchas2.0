import { expect, type Page, type Route, test } from "@playwright/test";

const administrador = {
  id: "a1000000-0000-4000-8000-000000000001",
  nombre: "Administradora UX",
  correo: "admin-ux@nexo.test",
  rol: "ADMINISTRADOR",
  debeCambiarContrasena: false,
  mfaHabilitado: true,
};

const producto = {
  id: "a2000000-0000-4000-8000-000000000001",
  nombre: "Colcha familiar azul",
  marca: "Vektra Hogar",
  sku: "COL-FAM-AZ",
  categoriaId: "a3000000-0000-4000-8000-000000000001",
  categoria: "Colchas",
  codigoBarras: "7501234567890",
  codigoQr: null,
  existencia: 5,
  existenciaMinima: 1,
  precioCompra: "500",
  precioVenta: "900",
  activo: true,
  tieneFoto: false,
  fotoActualizadaEn: null,
};

const proveedor = {
  id: "a4000000-0000-4000-8000-000000000001",
  nombre: "Textiles del Centro",
  contacto: "María",
  telefono: "2221234567",
  correo: null,
  rfc: null,
  notas: null,
  activo: true,
  _count: { compras: 3, itemsPedido: 1 },
};

const pedidoBase = {
  id: "a5000000-0000-4000-8000-000000000001",
  folio: "P-UX-001",
  estado: "LISTO_ENTREGA",
  fechaCompromiso: null,
  cliente: {
    id: "a6000000-0000-4000-8000-000000000001",
    nombreCompleto: "María Pedido",
    numeroTarjeta: "TAR-900",
  },
  items: [
    {
      id: "a7000000-0000-4000-8000-000000000001",
      descripcion: producto.nombre,
      cantidad: 1,
      precioEstimado: "900",
      producto: { id: producto.id, nombre: producto.nombre, sku: producto.sku },
      proveedor: { id: proveedor.id, nombre: proveedor.nombre },
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

async function json(route: Route, cuerpo: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(cuerpo),
  });
}

async function prepararSesion(
  page: Page,
  atender: (route: Route) => Promise<boolean>,
) {
  await page.route("**/api/**", async (route) => {
    if (await atender(route)) return;
    const ruta = new URL(route.request().url()).pathname;
    if (ruta.endsWith("/auth/sesion"))
      return json(route, { usuario: administrador });
    if (ruta.endsWith("/alertas"))
      return json(route, { totales: { total: 0 } });
    return json(
      route,
      { error: { codigo: "SIN_MOCK", mensaje: `Sin mock para ${ruta}` } },
      404,
    );
  });
}

test("el ajuste usa agregar o retirar, anticipa el resultado y conserva un intento fallido", async ({
  page,
}) => {
  let intentos = 0;
  const cuerpos: Array<Record<string, unknown>> = [];
  await prepararSesion(page, async (route) => {
    const solicitud = route.request();
    const ruta = new URL(solicitud.url()).pathname;
    if (ruta.endsWith("/inventario/catalogos-producto")) {
      await json(route, {
        marcas: [producto.marca],
        categorias: [{ id: producto.categoriaId, nombre: producto.categoria }],
      });
      return true;
    }
    if (
      ruta.endsWith("/inventario/productos") &&
      solicitud.method() === "GET"
    ) {
      await json(route, pagina([producto]));
      return true;
    }
    if (ruta.endsWith(`/inventario/productos/${producto.id}/ajuste`)) {
      intentos += 1;
      cuerpos.push(solicitud.postDataJSON());
      if (intentos === 1) {
        await json(
          route,
          { error: { mensaje: "Falla controlada de inventario" } },
          409,
        );
      } else {
        await json(route, { ...producto, existencia: 2 });
      }
      return true;
    }
    return false;
  });

  await page.goto("/inventario");
  await expect(page.getByText("Producto que no existe")).toBeHidden();
  await page.getByText("Guía rápida de inventario").click();
  await expect(page.getByText("Producto que no existe")).toBeVisible();

  await page
    .getByRole("button", {
      name: `Ajustar existencia de ${producto.nombre}`,
    })
    .click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByRole("button", { name: "Retirar" }).click();
  const piezas = dialogo.getByLabel("Piezas");
  await piezas.fill("8");
  await dialogo.getByLabel("Motivo obligatorio").fill("Conteo físico");
  await expect(dialogo.getByText("5 → -3")).toBeVisible();
  await expect(
    dialogo.getByRole("button", { name: "Aplicar ajuste" }),
  ).toBeDisabled();

  await piezas.fill("3");
  await expect(dialogo.getByText("5 → 2")).toBeVisible();
  await dialogo.getByRole("button", { name: "Aplicar ajuste" }).click();
  await expect(
    dialogo.getByText("Falla controlada de inventario"),
  ).toBeVisible();
  await expect(piezas).toHaveValue("3");
  await dialogo.getByRole("button", { name: "Aplicar ajuste" }).click();
  await expect(dialogo).toBeHidden();

  expect(cuerpos).toEqual([
    { cantidad: -3, notas: "Conteo físico" },
    { cantidad: -3, notas: "Conteo físico" },
  ]);
});

test("la entrega obliga a decidir contado o crédito y rechaza un vencimiento pasado", async ({
  page,
}) => {
  let entrega: Record<string, unknown> | null = null;
  await prepararSesion(page, async (route) => {
    const solicitud = route.request();
    const ruta = new URL(solicitud.url()).pathname;
    if (ruta.endsWith("/pedidos") && solicitud.method() === "GET") {
      await json(route, pagina([pedidoBase]));
      return true;
    }
    if (ruta.endsWith("/proveedores/opciones")) {
      await json(route, { datos: [proveedor] });
      return true;
    }
    if (ruta.endsWith("/inventario/catalogos-producto")) {
      await json(route, { marcas: [], categorias: [] });
      return true;
    }
    if (ruta.endsWith(`/pedidos/${pedidoBase.id}/entregar`)) {
      entrega = solicitud.postDataJSON();
      await json(
        route,
        { pedidoId: pedidoBase.id, venta: { folio: "V-UX-1" } },
        201,
      );
      return true;
    }
    return false;
  });

  await page.goto("/pedidos");
  await page.getByRole("button", { name: "Revisar y entregar" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByRole("checkbox").check();
  await dialogo.getByRole("button", { name: "Continuar" }).click();

  const continuar = dialogo.getByRole("button", { name: "Continuar" });
  await expect(continuar).toBeDisabled();
  await expect(
    dialogo.getByText("Debes elegir cómo se pagará antes de continuar."),
  ).toBeVisible();
  await dialogo.getByRole("button", { name: /^Crédito/ }).click();
  await dialogo.getByLabel("Cuánto pagará cada vez").fill("200");
  const vencimiento = dialogo.getByLabel("Primer vencimiento");
  const minimo = await vencimiento.getAttribute("min");
  expect(minimo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  await vencimiento.fill("2020-01-01");
  await expect(
    dialogo.getByText(
      "El primer vencimiento debe ser desde mañana en adelante.",
    ),
  ).toBeVisible();
  await expect(continuar).toBeDisabled();

  await vencimiento.fill(minimo!);
  await continuar.click();
  await expect(dialogo.getByText("Tipo de venta")).toBeVisible();
  await expect(dialogo.getByText("Crédito", { exact: true })).toBeVisible();
  await expect(dialogo.getByText(/900.00 se sumarán al saldo/)).toBeVisible();
  await dialogo
    .getByRole("button", {
      name: "Entregar, descontar inventario y crear venta",
    })
    .click();
  await expect.poll(() => entrega).not.toBeNull();
  expect(entrega).toMatchObject({
    tipo: "CREDITO",
    anticipo: 0,
    numeroTarjeta: "TAR-900",
    plan: { montoCuota: 200, primerVencimiento: expect.any(String) },
  });
});

test("un pedido recibido muestra únicamente la preparación como siguiente acción", async ({
  page,
}) => {
  const recibido = { ...pedidoBase, estado: "RECIBIDO_ALMACEN" };
  await prepararSesion(page, async (route) => {
    const ruta = new URL(route.request().url()).pathname;
    if (ruta.endsWith("/pedidos")) {
      await json(route, pagina([recibido]));
      return true;
    }
    if (ruta.endsWith("/proveedores/opciones")) {
      await json(route, { datos: [proveedor] });
      return true;
    }
    if (ruta.endsWith("/inventario/catalogos-producto")) {
      await json(route, { marcas: [], categorias: [] });
      return true;
    }
    return false;
  });

  await page.goto("/pedidos");
  await expect(
    page.getByRole("button", { name: "Revisar paquete" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Revisar y entregar" }),
  ).toHaveCount(0);
  await expect(page.getByText("1. Pedido")).toBeHidden();
  await page.getByText("Cómo avanza un pedido").click();
  await expect(page.getByText("1. Pedido")).toBeVisible();
});

test("el proveedor conserva el formulario fallido, evita doble envío y confirma la baja", async ({
  page,
}) => {
  let altas = 0;
  let cambiosEstado = 0;
  let ultimaAlta: Record<string, unknown> | null = null;
  await prepararSesion(page, async (route) => {
    const solicitud = route.request();
    const ruta = new URL(solicitud.url()).pathname;
    if (ruta.endsWith("/compras") && solicitud.method() === "GET") {
      await json(route, pagina([]));
      return true;
    }
    if (ruta.endsWith("/proveedores") && solicitud.method() === "GET") {
      await json(route, { datos: [proveedor] });
      return true;
    }
    if (ruta.endsWith("/pedidos") && solicitud.method() === "GET") {
      await json(route, pagina([]));
      return true;
    }
    if (ruta.endsWith("/proveedores") && solicitud.method() === "POST") {
      altas += 1;
      ultimaAlta = solicitud.postDataJSON();
      await new Promise((resolver) => setTimeout(resolver, 120));
      if (altas === 1)
        await json(route, { error: { mensaje: "Proveedor repetido" } }, 409);
      else await json(route, { ...proveedor, id: "proveedor-nuevo" }, 201);
      return true;
    }
    if (ruta.endsWith(`/proveedores/${proveedor.id}`)) {
      cambiosEstado += 1;
      await json(route, { ...proveedor, activo: false });
      return true;
    }
    return false;
  });

  await page.goto("/compras");
  await page.getByRole("button", { name: "Nuevo proveedor" }).click();
  let dialogo = page.getByRole("dialog");
  const nombre = dialogo.getByLabel("Nombre");
  await nombre.fill("Proveedor nuevo UX");
  await dialogo.getByRole("button", { name: "Guardar proveedor" }).dblclick();
  await expect(dialogo.getByText("Proveedor repetido")).toBeVisible();
  expect(altas).toBe(1);
  await expect(nombre).toHaveValue("Proveedor nuevo UX");
  await dialogo.getByRole("button", { name: "Guardar proveedor" }).click();
  await expect(dialogo).toBeHidden();
  expect(altas).toBe(2);
  expect(ultimaAlta).toMatchObject({
    nombre: "Proveedor nuevo UX",
    correo: null,
    telefono: null,
  });

  await page.getByRole("button", { name: "Proveedores", exact: true }).click();
  await page.getByRole("button", { name: "Dar de baja" }).click();
  dialogo = page.getByRole("dialog");
  await expect(dialogo.getByText(proveedor.nombre)).toBeVisible();
  expect(cambiosEstado).toBe(0);
  await dialogo.getByRole("button", { name: "Confirmar baja" }).click();
  await expect(dialogo).toBeHidden();
  expect(cambiosEstado).toBe(1);
});
