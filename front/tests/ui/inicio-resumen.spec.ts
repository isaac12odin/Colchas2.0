import { expect, test, type Page, type Route } from "@playwright/test";

const usuarioAdministrador = {
  id: "inicio-resumen-admin",
  nombre: "Administradora Resumen",
  correo: "resumen@nexo.test",
  rol: "ADMINISTRADOR",
  debeCambiarContrasena: false,
  mfaHabilitado: true,
};

function crearResumen(periodo: string, total: number) {
  return {
    periodo: {
      tipo: periodo,
      desde: "2026-01-01",
      hasta: "2026-12-31",
    },
    ventas: {
      total,
      bruto: total,
      devoluciones: 0,
      operaciones: 1,
      operacionesDevueltas: 0,
    },
    abonos: { total: 0, operaciones: 0 },
    compras: { total: 0, operaciones: 0 },
    cartera: { saldo: 500, vencido: 0 },
    operacion: {
      clientesActivos: 1,
      pedidosPendientes: 0,
      productosBajoMinimo: 0,
      valorInventarioCosto: 0,
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

async function prepararInicio(
  page: Page,
  responderResumen: (route: Route, periodo: string) => Promise<void>,
) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/auth/sesion"))
      return json(route, { usuario: usuarioAdministrador });
    if (url.pathname.endsWith("/alertas"))
      return json(route, { totales: { total: 0 } });
    if (url.pathname.endsWith("/reportes/resumen"))
      return responderResumen(route, url.searchParams.get("periodo") ?? "MES");
    return json(
      route,
      { error: { codigo: "SIN_MOCK", mensaje: url.pathname } },
      404,
    );
  });
}

test("limpia el periodo anterior y descarta una respuesta tardía", async ({
  page,
}) => {
  let liberarAnio: () => void = () => {};
  const anioPendiente = new Promise<void>((resolver) => {
    liberarAnio = resolver;
  });
  let confirmarSolicitudAnio: () => void = () => {};
  const solicitudAnio = new Promise<void>((resolver) => {
    confirmarSolicitudAnio = resolver;
  });
  let confirmarFinAnio: () => void = () => {};
  const finAnio = new Promise<void>((resolver) => {
    confirmarFinAnio = resolver;
  });

  await prepararInicio(page, async (route, periodo) => {
    if (periodo === "ANIO") {
      confirmarSolicitudAnio();
      await anioPendiente;
      try {
        await json(route, crearResumen(periodo, 999));
      } catch {
        // La cancelación del navegador puede cerrar la ruta antes de responder.
      } finally {
        confirmarFinAnio();
      }
      return;
    }
    await json(
      route,
      crearResumen(periodo, periodo === "BIMESTRE" ? 222 : 100),
    );
  });

  await page.goto("/inicio");
  await expect(page.getByText("$100.00", { exact: true })).toBeVisible();

  await page.getByLabel("Periodo").selectOption("ANIO");
  await solicitudAnio;
  await expect(page.getByText("Consultando el periodo…")).toBeVisible();
  await expect(page.getByText("$100.00", { exact: true })).toHaveCount(0);

  await page.getByLabel("Periodo").selectOption("BIMESTRE");
  await expect(page.getByText("$222.00", { exact: true })).toBeVisible();
  liberarAnio();
  await finAnio;
  await expect(page.getByText("$222.00", { exact: true })).toBeVisible();
  await expect(page.getByText("$999.00", { exact: true })).toHaveCount(0);
});

test("explica un fallo de carga y permite reintentar sin mostrar cifras viejas", async ({
  page,
}) => {
  let intentos = 0;
  let servicioDisponible = false;
  await prepararInicio(page, async (route, periodo) => {
    intentos += 1;
    if (!servicioDisponible)
      return json(
        route,
        {
          error: {
            codigo: "RESUMEN_NO_DISPONIBLE",
            mensaje: "El resumen no está disponible temporalmente.",
          },
        },
        503,
      );
    return json(route, crearResumen(periodo, 345));
  });

  await page.goto("/inicio");
  await expect(
    page.getByRole("alert").filter({
      hasText: "El resumen no está disponible temporalmente.",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "No mostramos cifras anteriores porque podrían corresponder a otro periodo.",
    ),
  ).toBeVisible();
  await expect(page.getByText("$345.00", { exact: true })).toHaveCount(0);

  const intentosAntesDelReintento = intentos;
  servicioDisponible = true;
  await page.getByRole("button", { name: "Reintentar consulta" }).click();
  await expect(page.getByText("$345.00", { exact: true })).toBeVisible();
  expect(intentos).toBeGreaterThan(intentosAntesDelReintento);
});
