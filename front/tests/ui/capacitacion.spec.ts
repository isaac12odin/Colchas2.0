import { expect, type Page, type Route, test } from "@playwright/test";

const administrador = {
  id: "capacitacion-admin-0001",
  nombre: "Administradora Capacitación",
  correo: "capacitacion@nexo.test",
  rol: "ADMINISTRADOR",
  debeCambiarContrasena: false,
  mfaHabilitado: true,
};

async function json(route: Route, cuerpo: unknown, estado = 200) {
  await route.fulfill({
    status: estado,
    contentType: "application/json",
    body: JSON.stringify(cuerpo),
  });
}

async function preparar(page: Page) {
  const mutaciones: string[] = [];
  await page.route("**/api/**", async (route) => {
    const solicitud = route.request();
    const ruta = new URL(solicitud.url()).pathname;
    if (!["GET", "HEAD", "OPTIONS"].includes(solicitud.method()))
      mutaciones.push(`${solicitud.method()} ${ruta}`);
    if (ruta.endsWith("/auth/sesion"))
      return json(route, { usuario: administrador });
    if (ruta.endsWith("/alertas"))
      return json(route, { totales: { total: 0 } });
    if (ruta.endsWith("/localidades")) return json(route, { datos: [] });
    if (ruta.endsWith("/auditoria"))
      return json(route, {
        datos: [],
        paginacion: { pagina: 1, limite: 20, total: 0, totalPaginas: 0 },
      });
    if (ruta.endsWith("/devoluciones"))
      return json(route, {
        datos: [],
        paginacion: { pagina: 1, limite: 15, total: 0, totalPaginas: 0 },
      });
    if (ruta.endsWith("/cortes/operadores")) return json(route, { datos: [] });
    return json(route, { error: { mensaje: `Sin mock para ${ruta}` } }, 404);
  });
  return mutaciones;
}

test("la capacitación usa el módulo real, bloquea lo ajeno y guarda la acción sólo localmente", async ({
  page,
}) => {
  const mutaciones = await preparar(page);
  await page.goto("/capacitacion");

  await expect(
    page.getByRole("heading", {
      name: "Plan de puesta en marcha y capacitación",
    }),
  ).toBeVisible();
  await expect(page.getByTestId("plan-puesta-en-marcha")).toContainText(
    "Antes de capturar, reúne esto",
  );
  await expect(page.getByTestId("plan-puesta-en-marcha")).toContainText(
    "Orden correcto de configuración y uso",
  );
  await expect(page.locator("main article")).toHaveCount(24);
  const contenido = await page.getByTestId("centro-capacitacion").innerText();
  expect(
    contenido.indexOf("Crear localidades antes que clientes"),
  ).toBeLessThan(contenido.indexOf("Crear el expediente del cliente"));
  await expect(page.getByTestId("capacitacion-sin-db")).toContainText(
    "no modifica la base de datos",
  );
  const articulo = page
    .getByRole("heading", { name: "Crear localidades antes que clientes" })
    .locator("xpath=ancestor::article");
  await articulo
    .getByRole("button", { name: "Practicar en la pantalla real" })
    .click();

  await expect(page).toHaveURL(
    /\/configuracion\?practica=configuracion-localidades/,
  );
  await expect(
    page.getByRole("heading", { name: "Configuración empresarial" }),
  ).toBeVisible();
  const entrenador = page.getByTestId("entrenador-pantalla-real");
  await expect(entrenador).toContainText("GUÍA PASO A PASO · PANTALLA REAL");
  await expect(entrenador).toContainText("MICROEJEMPLO · NO LO COPIES");
  await expect(entrenador).toContainText("PASO 1 DE 5");
  await expect(
    page.getByRole("button", { name: "Localidades" }),
  ).toHaveAttribute("aria-disabled", "true");

  await page.getByTestId("mostrar-objetivo-practica").click();
  await expect(
    page.locator('[data-capacitacion-objetivo="true"]'),
  ).toHaveAttribute("data-capacitacion", "configuracion.localidades.tab");
  await page.getByRole("button", { name: "Localidades", exact: true }).click();
  await expect(page.getByTestId("accion-real-detectada")).toBeVisible();
  await page.getByTestId("continuar-practica-real").click();

  await page.getByTestId("mostrar-objetivo-practica").click();
  await page.getByRole("button", { name: "Localidad", exact: true }).click();
  await page.getByTestId("continuar-practica-real").click();

  const dialogo = page.getByRole("dialog");
  await expect(dialogo).toBeVisible();
  await expect(page.locator("[data-modal-operativo]")).toHaveCSS(
    "position",
    "static",
  );
  await page.getByTestId("mostrar-objetivo-practica").click();
  const nombreLocalidad = dialogo.getByLabel("Nombre");
  await nombreLocalidad.fill("Zona práctica");
  await nombreLocalidad.press("Enter");
  await page.getByTestId("continuar-practica-real").click();

  await page.getByTestId("mostrar-objetivo-practica").click();
  const estadoLocalidad = dialogo.getByLabel("Estado");
  await estadoLocalidad.fill("Puebla");
  await estadoLocalidad.press("Enter");
  await page.getByTestId("continuar-practica-real").click();

  await page.getByTestId("mostrar-objetivo-practica").click();
  await dialogo.getByRole("button", { name: "Guardar" }).click();
  await expect(entrenador).toContainText(
    "La localidad queda simulada sólo en este navegador",
  );
  await page.getByTestId("continuar-practica-real").click();
  await expect(page).toHaveURL(/\/capacitacion\?pantalla=configuracion/);

  const accionesLocales = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem(
        "nexo:capacitacion:capacitacion-admin-0001:acciones:v2",
      ) ?? "[]",
    ),
  );
  expect(accionesLocales.length).toBeGreaterThanOrEqual(4);
  const escriturasLocales = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem("nexo:capacitacion:mutaciones-reales:v3") ?? "[]",
    ),
  );
  expect(escriturasLocales).toMatchObject([
    {
      metodo: "POST",
      ruta: "/localidades",
      leccionId: "configuracion-localidades",
    },
  ]);
  expect(mutaciones).toEqual([]);
  await page.reload();
  await expect(
    page.getByText("COMPLETADA", { exact: true }).first(),
  ).toBeVisible();
  expect(mutaciones).toEqual([]);
});

test("recepción y preparación avanzan dos estados reales sólo en memoria local", async ({
  page,
}) => {
  const mutacionesRed = await preparar(page);
  const pedido = {
    id: "pedido-practica-1",
    folio: "PED-DEMO-104",
    estado: "PEDIDO_PROVEEDOR",
    fechaCompromiso: "2026-08-26T12:00:00.000Z",
    cliente: {
      id: "cliente-practica-1",
      nombreCompleto: "Ana López",
      numeroTarjeta: "NX-3001",
    },
    items: [
      {
        id: "item-practica-1",
        descripcion: "Colcha matrimonial azul",
        cantidad: 2,
        precioEstimado: "1200",
        producto: {
          id: "producto-practica-1",
          nombre: "Colcha matrimonial azul",
          sku: "COL-AZ-MAT",
        },
        proveedor: {
          id: "proveedor-practica-1",
          nombre: "Textiles del Centro",
        },
      },
    ],
  };
  await page.route("**/api/pedidos**", async (route) => {
    if (!["GET", "HEAD"].includes(route.request().method()))
      return route.fallback();
    return json(route, { datos: [pedido] });
  });

  await page.goto("/pedidos?practica=pedido-recibir-preparar");
  const entrenador = page.getByTestId("entrenador-pantalla-real");
  await expect(entrenador).toContainText("PASO 1 DE 8");

  await page.getByTestId("mostrar-objetivo-practica").click();
  await page
    .getByRole("button", { name: "Pedido al proveedor", exact: true })
    .click();
  await page.getByTestId("continuar-practica-real").click();

  await page.getByTestId("mostrar-objetivo-practica").click();
  await expect(page.getByTestId("accion-real-detectada")).toBeVisible();
  await page.getByTestId("continuar-practica-real").click();

  await page.getByTestId("mostrar-objetivo-practica").click();
  await page.getByRole("button", { name: "Revisar recepción" }).click();
  await expect(page.getByTestId("accion-real-detectada")).toBeVisible();
  await page.getByTestId("continuar-practica-real").click();

  await page.getByTestId("mostrar-objetivo-practica").click();
  await page.getByRole("checkbox").click();
  await expect(page.getByTestId("accion-real-detectada")).toBeVisible();
  await page.getByTestId("continuar-practica-real").click();
  await expect(entrenador).toContainText("PASO 5 DE 8");

  await page.getByTestId("mostrar-objetivo-practica").click();
  await page
    .getByRole("button", { name: "Confirmar recepción física" })
    .click();
  await expect(page.getByTestId("accion-real-detectada")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Revisar paquete", exact: true }),
  ).toBeVisible();
  await page.getByTestId("continuar-practica-real").click();

  await page.getByTestId("mostrar-objetivo-practica").click();
  await page
    .getByRole("button", { name: "Revisar paquete", exact: true })
    .click();
  await expect(page.getByTestId("accion-real-detectada")).toBeVisible();
  await page.getByTestId("continuar-practica-real").click();

  await page.getByTestId("mostrar-objetivo-practica").click();
  await page.getByRole("checkbox").click();
  await expect(page.getByTestId("accion-real-detectada")).toBeVisible();
  await page.getByTestId("continuar-practica-real").click();
  await expect(entrenador).toContainText("PASO 8 DE 8");

  await page.getByTestId("mostrar-objetivo-practica").click();
  await page.getByRole("button", { name: "Confirmar paquete listo" }).click();
  await expect(page.getByTestId("accion-real-detectada")).toBeVisible();
  await expect(entrenador).toContainText(
    "El estado final se simula sólo en este navegador",
  );

  const mutacionesLocales = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem("nexo:capacitacion:mutaciones-reales:v3") ?? "[]",
    ),
  );
  expect(mutacionesLocales).toMatchObject([
    {
      metodo: "PATCH",
      ruta: "/pedidos/pedido-practica-1/estado",
      cuerpo: { estado: "RECIBIDO_ALMACEN" },
    },
    {
      metodo: "PATCH",
      ruta: "/pedidos/pedido-practica-1/estado",
      cuerpo: { estado: "LISTO_ENTREGA" },
    },
  ]);
  expect(mutacionesRed).toEqual([]);
});

test("el administrador puede revisar la capacitación por rol y el cobrador no asigna proveedor", async ({
  page,
}) => {
  await preparar(page);
  await page.goto("/capacitacion?pantalla=pedidos");
  await page.getByTestId("selector-rol-capacitacion").selectOption("COBRADOR");

  await expect(page.getByText("Entregar pedido y generar venta")).toBeVisible();
  await expect(page.getByText("Asignar quién surtirá")).toHaveCount(0);

  await page.getByTestId("selector-rol-capacitacion").selectOption("CONTABLE");
  await expect(page.getByText("Asignar quién surtirá")).toBeVisible();
  await expect(
    page.getByText(/Administración · Contabilidad · Almacén/),
  ).toBeVisible();
  await expect(page.getByTestId("ayuda-contextual")).toHaveAttribute(
    "href",
    /capacitacion\?pantalla=capacitacion/,
  );
});

test("Almacén sólo revisa devoluciones y la autorización queda en Administración y Contabilidad", async ({
  page,
}) => {
  await preparar(page);
  await page.goto("/capacitacion?pantalla=devoluciones");
  await page
    .getByTestId("selector-rol-capacitacion")
    .selectOption("ALMACENISTA");

  await expect(page.getByText("Revisar mercancía devuelta")).toBeVisible();
  await expect(page.getByText("Devolución sin borrar historial")).toHaveCount(
    0,
  );

  const articulo = page
    .getByRole("heading", { name: "Revisar mercancía devuelta" })
    .locator("xpath=ancestor::article");
  await articulo.getByRole("button").click();
  await expect(page).toHaveURL(
    /\/devoluciones\?practica=devolucion-revisar-almacen/,
  );
  await expect(
    page.getByRole("heading", { name: "Devoluciones y cancelaciones" }),
  ).toBeVisible();
  await expect(page.getByTestId("entrenador-pantalla-real")).toBeVisible();
  await expect(page.getByText("Autorizar", { exact: true })).toHaveCount(0);
  await expect(
    page.getByText("Confirmar reembolso", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Salir de la práctica" }).click();
  await page.getByTestId("selector-rol-capacitacion").selectOption("CONTABLE");
  await expect(page.getByText("Devolución sin borrar historial")).toBeVisible();
  await page
    .getByTestId("selector-rol-capacitacion")
    .selectOption("ADMINISTRADOR");
  await expect(page.getByText("Devolución sin borrar historial")).toBeVisible();
});
