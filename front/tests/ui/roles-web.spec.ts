import { expect, test, type Page, type Route } from "@playwright/test";

type Rol =
  | "ADMINISTRADOR"
  | "CONTABLE"
  | "VENDEDOR"
  | "ALMACENISTA"
  | "COBRADOR";

const casos: Array<{
  rol: Rol;
  accionPrincipal: RegExp;
  moduloProhibido?: string;
}> = [
  { rol: "ADMINISTRADOR", accionPrincipal: /Hacer una venta/ },
  { rol: "CONTABLE", accionPrincipal: /Registrar un abono/ },
  {
    rol: "VENDEDOR",
    accionPrincipal: /Hacer una venta/,
    moduloProhibido: "Inventario",
  },
];

const resumenVacio = {
  periodo: { tipo: "MES", desde: "2026-08-01", hasta: "2026-08-31" },
  ventas: {
    total: 0,
    bruto: 0,
    devoluciones: 0,
    operaciones: 0,
    operacionesDevueltas: 0,
  },
  abonos: { total: 0, operaciones: 0 },
  compras: { total: 0, operaciones: 0 },
  cartera: { saldo: 0, vencido: 0 },
  operacion: {
    clientesActivos: 0,
    pedidosPendientes: 0,
    productosBajoMinimo: 0,
    valorInventarioCosto: 0,
  },
};

async function json(route: Route, cuerpo: unknown, estado = 200) {
  await route.fulfill({
    status: estado,
    contentType: "application/json",
    body: JSON.stringify(cuerpo),
  });
}

for (const rol of ["ALMACENISTA", "COBRADOR"] as const) {
  test(`${rol.toLowerCase()} usa móvil y no conserva sesión web`, async ({
    page,
  }) => {
    await prepararRol(page, rol);
    await page.goto("/inicio");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByLabel("Correo electrónico")).toBeVisible();
    await expect(page.locator("aside")).toHaveCount(0);
  });
}

async function prepararRol(page: Page, rol: Rol) {
  let consultasReporte = 0;
  await page.route("**/api/**", async (route) => {
    const ruta = new URL(route.request().url()).pathname;
    if (ruta.endsWith("/auth/sesion"))
      return json(route, {
        usuario: {
          id: `usuario-${rol.toLowerCase()}`,
          nombre: `${rol[0]}${rol.slice(1).toLowerCase()} Pruebas`,
          correo: `${rol.toLowerCase()}@nexo.test`,
          rol,
          debeCambiarContrasena: false,
          mfaHabilitado: rol === "ADMINISTRADOR",
        },
      });
    if (ruta.endsWith("/alertas"))
      return json(route, { totales: { total: 2 } });
    if (ruta.endsWith("/reportes/resumen")) {
      consultasReporte += 1;
      return json(route, resumenVacio);
    }
    return json(route, { error: { mensaje: `Sin mock para ${ruta}` } }, 404);
  });
  return () => consultasReporte;
}

for (const caso of casos) {
  test(`inicio sencillo y seguro para ${caso.rol.toLowerCase()}`, async ({
    page,
  }) => {
    const consultasReporte = await prepararRol(page, caso.rol);
    await page.goto("/inicio");

    await expect(
      page.getByRole("heading", { name: "¿Qué vas a hacer?" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: caso.accionPrincipal }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("Acción rápida", { exact: true }),
    ).toBeVisible();
    if (caso.moduloProhibido)
      await expect(
        page
          .locator("aside")
          .getByRole("link", { name: caso.moduloProhibido, exact: true }),
      ).toHaveCount(0);

    if (caso.rol === "ADMINISTRADOR" || caso.rol === "CONTABLE") {
      await expect(
        page.getByRole("heading", { name: "Resumen de operación" }),
      ).toBeVisible();
      await expect.poll(consultasReporte).toBeGreaterThan(0);
    } else {
      await expect(
        page.getByRole("heading", { name: "Resumen de operación" }),
      ).toHaveCount(0);
      expect(consultasReporte()).toBe(0);
    }
  });
}

test("los accesos rápidos abren el formulario exacto y limpian la URL", async ({
  page,
}) => {
  await page.route("**/api/**", async (route) => {
    const ruta = new URL(route.request().url()).pathname;
    if (ruta.endsWith("/auth/sesion"))
      return json(route, {
        usuario: {
          id: "admin-acceso-rapido",
          nombre: "Administradora Directa",
          correo: "directa@nexo.test",
          rol: "ADMINISTRADOR",
          debeCambiarContrasena: false,
          mfaHabilitado: true,
        },
      });
    if (ruta.endsWith("/alertas"))
      return json(route, { totales: { total: 0 } });
    if (ruta.endsWith("/inventario/productos"))
      return json(route, {
        datos: [],
        paginacion: { pagina: 1, limite: 18, total: 0, totalPaginas: 0 },
      });
    if (ruta.endsWith("/clientes"))
      return json(route, {
        datos: [],
        paginacion: { pagina: 1, limite: 15, total: 0, totalPaginas: 0 },
      });
    if (ruta.endsWith("/localidades")) return json(route, { datos: [] });
    return json(route, { error: { mensaje: `Sin mock para ${ruta}` } }, 404);
  });

  await page.goto("/inventario?accion=nuevo");
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: "Nuevo producto" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/inventario$/);

  await page.goto("/clientes?accion=abono");
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: "Registrar abono" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/clientes$/);
});

test("alertas no ofrece acciones fuera del rol y cambia completamente de idioma", async ({
  page,
}) => {
  await page.route("**/api/**", async (route) => {
    const ruta = new URL(route.request().url()).pathname;
    if (ruta.endsWith("/auth/sesion"))
      return json(route, {
        usuario: {
          id: "vendedora-alertas",
          nombre: "Vendedora Alertas",
          correo: "vendedora-alertas@nexo.test",
          rol: "VENDEDOR",
          debeCambiarContrasena: false,
          mfaHabilitado: false,
        },
      });
    if (ruta.endsWith("/alertas"))
      return json(route, {
        actualizadoEn: "2026-09-01T12:00:00.000Z",
        totales: {
          bajoInventario: 1,
          clientesVencidos: 0,
          pedidosAtrasados: 0,
          rutasIncompletas: 1,
          total: 2,
        },
        productos: [
          {
            id: "producto-alerta",
            nombre: "Colcha de práctica",
            sku: "ALERTA-01",
            existencia: 1,
            existenciaMinima: 3,
          },
        ],
        clientes: [],
        pedidos: [],
        rutas: [{ id: "ruta-alerta", nombre: "Ruta Centro", pendientes: 2 }],
      });
    return json(route, { error: { mensaje: `Sin mock para ${ruta}` } }, 404);
  });

  await page.goto("/alertas");
  await expect(
    page.getByRole("heading", { name: "Alertas empresariales" }),
  ).toBeVisible();
  await expect(
    page.getByTestId("alertas-categorias-activas").getByRole("link"),
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Inventario" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Rutas" })).toHaveCount(0);
  await expect(
    page.getByText("Consulta informativa; tu rol no realiza esta acción."),
  ).toHaveCount(2);

  await page.getByTitle("English").click();
  await expect(
    page.getByRole("heading", { name: "Business alerts" }),
  ).toBeVisible();
  await expect(
    page.getByText("For reference; your role does not perform this action."),
  ).toHaveCount(2);
});
