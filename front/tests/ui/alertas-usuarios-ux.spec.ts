import { expect, test, type Page, type Route } from "@playwright/test";

const administradora = {
  id: "usuario-propio-ux",
  nombre: "Administradora UX",
  correo: "admin-ux@nexo.test",
  rol: "ADMINISTRADOR",
  debeCambiarContrasena: false,
  mfaHabilitado: true,
};

const usuarioAjeno = {
  id: "usuario-ajeno-ux",
  nombre: "Contable UX",
  correo: "contable-ux@nexo.test",
  rol: "CONTABLE",
  activo: true,
  ultimoAcceso: null,
  debeCambiarContrasena: false,
};

async function json(route: Route, cuerpo: unknown, estado = 200) {
  await route.fulfill({
    status: estado,
    contentType: "application/json",
    body: JSON.stringify(cuerpo),
  });
}

function respuestaAlertas() {
  return {
    actualizadoEn: "2026-09-01T16:00:00.000Z",
    totales: {
      bajoInventario: 0,
      clientesVencidos: 1,
      pedidosAtrasados: 0,
      rutasIncompletas: 0,
      total: 1,
    },
    productos: [],
    clientes: [
      {
        id: "cliente-vencido-ux",
        nombreCompleto: "María Vencida",
        numeroTarjeta: "UX-01",
        saldo: { saldoActual: "1200", vencidoActual: "400" },
      },
    ],
    pedidos: [],
    rutas: [],
  };
}

async function sesionAdministradora(page: Page) {
  await page.route("**/api/auth/sesion*", (route) =>
    json(route, { usuario: administradora }),
  );
}

test("alertas distingue carga, error y datos confirmados a 320 px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await sesionAdministradora(page);
  let liberarConsulta: () => void = () => {};
  const consultaPendiente = new Promise<void>((resolver) => {
    liberarConsulta = resolver;
  });
  let consultasBloqueadas = true;
  let servicioDisponible = false;

  await page.route("**/api/alertas*", async (route) => {
    if (consultasBloqueadas) await consultaPendiente;
    if (!servicioDisponible)
      return json(
        route,
        {
          error: {
            codigo: "ALERTAS_NO_DISPONIBLES",
            mensaje: "No fue posible confirmar las alertas.",
          },
        },
        503,
      );
    return json(route, respuestaAlertas());
  });

  await page.goto("/alertas");
  await expect(page.getByTestId("alertas-estado-cargando")).toBeVisible();
  consultasBloqueadas = false;
  liberarConsulta();

  const estadoError = page.getByTestId("alertas-estado-error");
  await expect(estadoError).toBeVisible();
  await expect(estadoError).toContainText(
    "No mostramos totales en cero porque todavía no pudimos confirmarlos.",
  );
  await expect(page.getByTestId("alertas-al-corriente")).toHaveCount(0);
  await expect(
    page.getByText("La operación está al corriente", { exact: false }),
  ).toHaveCount(0);

  servicioDisponible = true;
  await estadoError.getByRole("button", { name: "Reintentar" }).click();
  const activas = page.getByTestId("alertas-categorias-activas");
  await expect(
    activas.getByRole("heading", { name: /Clientes vencidos/ }),
  ).toBeVisible();
  await expect(
    activas.getByRole("link", { name: "Atender cartera vencida" }),
  ).toBeVisible();
  await expect(page.getByTestId("alertas-al-corriente")).toContainText(
    "3 categorías al corriente",
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
});

test("el menú móvil anuncia las alertas sin obligar a abrir el panel", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.route("**/api/**", (route) => {
    const ruta = new URL(route.request().url()).pathname;
    if (ruta.endsWith("/auth/sesion"))
      return json(route, { usuario: administradora });
    if (ruta.endsWith("/alertas"))
      return json(route, { totales: { total: 3 } });
    return json(route, { error: { mensaje: `Sin mock para ${ruta}` } }, 404);
  });

  await page.goto("/inicio");
  const menu = page.getByTestId("menu-movil");
  await expect(menu).toHaveAttribute(
    "aria-label",
    "Abrir menú, 3 alertas pendientes",
  );
  await expect(page.getByTestId("menu-movil-alertas")).toHaveText("3");
});

async function prepararUsuarios(
  page: Page,
  atender: (route: Route, metodo: string, ruta: string) => Promise<void>,
) {
  await sesionAdministradora(page);
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const ruta = url.pathname.replace(/^\/api/, "");
    const metodo = route.request().method();
    if (ruta === "/auth/sesion")
      return json(route, { usuario: administradora });
    if (ruta === "/alertas") return json(route, { totales: { total: 0 } });
    if (ruta === "/usuarios" && metodo === "GET")
      return json(route, {
        datos: [
          {
            ...administradora,
            activo: true,
            ultimoAcceso: "2026-09-01T12:00:00.000Z",
          },
          usuarioAjeno,
        ],
        paginacion: {
          pagina: 1,
          limite: 15,
          total: 2,
          totalPaginas: 1,
        },
      });
    return atender(route, metodo, ruta);
  });
}

test("crear usuario conserva el error en el modal y bloquea envíos duplicados", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  let solicitudesCrear = 0;
  let liberarCreacion: () => void = () => {};
  const creacionPendiente = new Promise<void>((resolver) => {
    liberarCreacion = resolver;
  });
  await prepararUsuarios(page, async (route, metodo, ruta) => {
    if (ruta === "/usuarios" && metodo === "POST") {
      solicitudesCrear += 1;
      if (solicitudesCrear === 1)
        return json(
          route,
          {
            error: {
              codigo: "CORREO_DUPLICADO",
              mensaje: "Ya existe una cuenta con ese correo.",
            },
          },
          409,
        );
      await creacionPendiente;
      return json(route, { id: "usuario-creado-ux" }, 201);
    }
    return json(
      route,
      { error: { codigo: "SIN_MOCK", mensaje: `${metodo} ${ruta}` } },
      404,
    );
  });

  await page.goto("/usuarios");
  await page.getByRole("button", { name: "Nuevo" }).click();
  const dialogo = page.getByRole("dialog", { name: "Nuevo usuario" });
  await expect(dialogo).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");

  const selectorRol = dialogo.getByLabel("Rol");
  await expect(selectorRol).toHaveValue("");
  expect(
    await selectorRol
      .locator("option")
      .evaluateAll((opciones) =>
        opciones.map((opcion) => (opcion as HTMLOptionElement).value),
      ),
  ).toEqual([
    "",
    "CONTABLE",
    "VENDEDOR",
    "ALMACENISTA",
    "COBRADOR",
    "ADMINISTRADOR",
  ]);
  await expect(dialogo).toContainText("Asigna el menor acceso necesario");
  await dialogo.getByLabel("Nombre").fill("Nueva Operadora");
  await dialogo.getByLabel("Correo").fill("nueva@nexo.test");
  await selectorRol.selectOption("CONTABLE");
  await dialogo
    .getByLabel("Contraseña temporal (mínimo 12)")
    .fill("ClaveTemporal!2026");

  await dialogo.getByRole("button", { name: "Guardar" }).click();
  await expect(dialogo.getByRole("alert")).toContainText(
    "Ya existe una cuenta con ese correo.",
  );
  await expect(dialogo.getByLabel("Correo")).toHaveValue("nueva@nexo.test");

  await dialogo.getByRole("button", { name: "Guardar" }).click();
  await expect(
    dialogo.getByRole("button", { name: "Guardando…" }),
  ).toBeDisabled();
  await dialogo.locator("form").evaluate((formulario) => {
    formulario.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
  });
  await expect.poll(() => solicitudesCrear).toBe(2);
  liberarCreacion();
  await expect(dialogo).toHaveCount(0);
  expect(solicitudesCrear).toBe(2);
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
});

test("impide desactivar la cuenta propia y confirma la desactivación ajena", async ({
  page,
}) => {
  let cambiosEstado = 0;
  await prepararUsuarios(page, async (route, metodo, ruta) => {
    if (ruta === `/usuarios/${usuarioAjeno.id}` && metodo === "PATCH") {
      cambiosEstado += 1;
      return json(route, { ...usuarioAjeno, activo: false });
    }
    return json(
      route,
      { error: { codigo: "SIN_MOCK", mensaje: `${metodo} ${ruta}` } },
      404,
    );
  });

  await page.goto("/usuarios");
  const filaPropia = page.getByRole("row").filter({
    hasText: administradora.correo,
  });
  const desactivarPropia = filaPropia.getByRole("button", {
    name: "Desactivar",
  });
  await expect(desactivarPropia).toBeDisabled();
  await expect(desactivarPropia).toHaveAttribute(
    "title",
    "No puedes desactivar tu propia cuenta",
  );

  const filaAjena = page
    .getByRole("row")
    .filter({ hasText: usuarioAjeno.correo });
  const desactivarAjena = filaAjena.getByRole("button", {
    name: "Desactivar",
  });
  page.once("dialog", async (dialogo) => {
    expect(dialogo.type()).toBe("confirm");
    expect(dialogo.message()).toContain("Contable UX");
    await dialogo.dismiss();
  });
  await desactivarAjena.click();
  expect(cambiosEstado).toBe(0);

  page.once("dialog", async (dialogo) => dialogo.accept());
  await desactivarAjena.click();
  await expect.poll(() => cambiosEstado).toBe(1);
  await expect(
    page.getByText("Cuenta de Contable UX desactivada."),
  ).toBeVisible();
});

test("el encabezado identifica Perfil y el cierre del modal es bilingüe", async ({
  page,
}) => {
  await page.route("**/api/**", async (route) => {
    const ruta = new URL(route.request().url()).pathname;
    if (ruta.endsWith("/auth/sesion"))
      return json(route, { usuario: administradora });
    if (ruta.endsWith("/alertas"))
      return json(route, { totales: { total: 0 } });
    return json(route, { error: { mensaje: `Sin mock para ${ruta}` } }, 404);
  });
  await page.goto("/perfil");
  await expect(
    page.locator("header").getByText("Perfil", { exact: true }),
  ).toBeVisible();

  await page.goto("/usuarios");
  await page.getByRole("button", { name: "Nuevo" }).click();
  await expect(
    page.getByRole("button", { name: "Cerrar ventana" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cerrar ventana" }).click();
  await page.getByTitle("English").click();
  await page.getByRole("button", { name: "New" }).click();
  await expect(
    page.getByRole("button", { name: "Close dialog" }),
  ).toBeVisible();
});
