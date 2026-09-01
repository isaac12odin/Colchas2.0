import { expect, test, type Page, type Route } from "@playwright/test";

const administradora = {
  id: "00000000-0000-4000-8000-000000000101",
  nombre: "Administradora Directorios",
  correo: "directorios@nexo.test",
  rol: "ADMINISTRADOR",
  debeCambiarContrasena: false,
  mfaHabilitado: true,
};

function pedido(indice: number, nombre: string) {
  return {
    id: `10000000-0000-4000-8000-${String(indice).padStart(12, "0")}`,
    folio: `P-PAG-${String(indice).padStart(3, "0")}`,
    estado: "PENDIENTE_PEDIR",
    fechaCompromiso: null,
    cliente: {
      id: `20000000-0000-4000-8000-${String(indice).padStart(12, "0")}`,
      nombreCompleto: nombre,
      numeroTarjeta: `T-${indice}`,
    },
    items: [
      {
        id: `30000000-0000-4000-8000-${String(indice).padStart(12, "0")}`,
        descripcion: `Colcha catálogo ${indice}`,
        cantidad: 1,
        precioEstimado: "900",
        producto: {
          id: `40000000-0000-4000-8000-${String(indice).padStart(12, "0")}`,
          nombre: `Colcha catálogo ${indice}`,
          sku: `COL-${indice}`,
        },
        proveedor: null,
      },
    ],
  };
}

function usuario(indice: number, nombre: string, rol = "COBRADOR") {
  return {
    id: `50000000-0000-4000-8000-${String(indice).padStart(12, "0")}`,
    nombre,
    correo: `usuario${indice}@nexo.test`,
    rol,
    activo: true,
    ultimoAcceso: null,
    debeCambiarContrasena: false,
  };
}

function pagina<T>(
  datos: T[],
  opciones: { pagina?: number; limite?: number; total?: number } = {},
) {
  const paginaActual = opciones.pagina ?? 1;
  const limite = opciones.limite ?? 12;
  const total = opciones.total ?? datos.length;
  return {
    datos,
    paginacion: {
      pagina: paginaActual,
      limite,
      total,
      totalPaginas: Math.max(1, Math.ceil(total / limite)),
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

async function esperar(ms: number) {
  await new Promise((resolver) => setTimeout(resolver, ms));
}

async function base(page: Page, atender: (route: Route) => Promise<boolean>) {
  await page.route("**/api/**", async (route) => {
    if (await atender(route)) return;
    const ruta = new URL(route.request().url()).pathname;
    if (ruta.endsWith("/auth/sesion"))
      return json(route, { usuario: administradora });
    if (ruta.endsWith("/alertas"))
      return json(route, { totales: { total: 0 } });
    if (ruta.endsWith("/proveedores/opciones"))
      return json(route, { datos: [] });
    if (ruta.endsWith("/inventario/catalogos-producto"))
      return json(route, { marcas: [], categorias: [] });
    return json(
      route,
      { error: { codigo: "NO_MOCK", mensaje: `Sin mock para ${ruta}` } },
      404,
    );
  });
}

test("pedidos carga, pagina y busca exclusivamente mediante el servidor", async ({
  page,
}) => {
  const consultas: URLSearchParams[] = [];
  await base(page, async (route) => {
    const solicitud = route.request();
    const url = new URL(solicitud.url());
    if (!url.pathname.endsWith("/pedidos") || solicitud.method() !== "GET")
      return false;
    consultas.push(new URLSearchParams(url.search));
    await esperar(250);
    const buscar = url.searchParams.get("buscar");
    const paginaActual = Number(url.searchParams.get("pagina") ?? "1");
    if (buscar === "Ana") {
      await json(route, pagina([pedido(3, "Ana Encontrada")], { total: 1 }));
    } else if (paginaActual === 2) {
      await json(
        route,
        pagina([pedido(2, "Segunda página")], {
          pagina: 2,
          total: 13,
        }),
      );
    } else {
      await json(route, pagina([pedido(1, "Primera página")], { total: 13 }));
    }
    return true;
  });

  await page.goto("/pedidos");
  await expect(page.getByRole("status")).toContainText("Cargando pedidos");
  await expect(page.getByText(/No se encontraron pedidos/)).toHaveCount(0);
  await expect(page.getByText("Primera página", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByText("Segunda página", { exact: true })).toBeVisible();

  const filtros = page.locator('[data-capacitacion="pedidos.filtros"]');
  await filtros.getByPlaceholder(/Folio, cliente/).fill("Ana");
  await filtros.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByText("Ana Encontrada", { exact: true })).toBeVisible();

  expect(
    consultas.some(
      (consulta) =>
        consulta.get("pagina") === "2" && consulta.get("limite") === "12",
    ),
  ).toBe(true);
  expect(
    consultas.some(
      (consulta) =>
        consulta.get("buscar") === "Ana" && consulta.get("pagina") === "1",
    ),
  ).toBe(true);
});

test("usuarios pagina, combina filtros y distingue error de resultado vacío", async ({
  page,
}) => {
  const consultas: URLSearchParams[] = [];
  let fallosControlados = 0;
  await base(page, async (route) => {
    const solicitud = route.request();
    const url = new URL(solicitud.url());
    if (!url.pathname.endsWith("/usuarios") || solicitud.method() !== "GET")
      return false;
    consultas.push(new URLSearchParams(url.search));
    await esperar(200);
    const buscar = url.searchParams.get("buscar");
    if (buscar === "falla") {
      fallosControlados += 1;
      if (fallosControlados === 1) {
        await json(
          route,
          { error: { codigo: "FALLA", mensaje: "Falla controlada" } },
          500,
        );
      } else {
        await json(route, pagina([usuario(4, "Recuperada")], { limite: 15 }));
      }
      return true;
    }
    if (buscar === "nadie") {
      await json(route, pagina([], { limite: 15, total: 0 }));
      return true;
    }
    const paginaActual = Number(url.searchParams.get("pagina") ?? "1");
    if (paginaActual === 2) {
      await json(
        route,
        pagina([usuario(2, "Usuario segunda página")], {
          pagina: 2,
          limite: 15,
          total: 16,
        }),
      );
    } else {
      await json(
        route,
        pagina([usuario(1, "Usuario primera página")], {
          limite: 15,
          total: 16,
        }),
      );
    }
    return true;
  });

  await page.goto("/usuarios");
  await expect(page.getByRole("status")).toContainText("Cargando usuarios");
  await expect(page.getByText(/No se encontraron usuarios/)).toHaveCount(0);
  await expect(
    page.getByText("Usuario primera página", { exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(
    page.getByText("Usuario segunda página", { exact: true }),
  ).toBeVisible();

  await page.getByLabel("Filtrar por rol").selectOption("COBRADOR");
  await expect(
    page.getByText("Usuario primera página", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Filtrar por estado").selectOption("true");
  await expect(
    page.getByText("Usuario primera página", { exact: true }),
  ).toBeVisible();
  expect(
    consultas.some(
      (consulta) =>
        consulta.get("rol") === "COBRADOR" &&
        consulta.get("activo") === "true" &&
        consulta.get("pagina") === "1",
    ),
  ).toBe(true);

  const filtros = page.locator('[data-capacitacion="usuarios.filtros"]');
  await filtros.getByPlaceholder("Nombre o correo").fill("nadie");
  await filtros.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Cargando usuarios");
  await expect(page.getByText(/No se encontraron usuarios/)).toHaveCount(0);
  await expect(page.getByText(/No se encontraron usuarios/)).toBeVisible();

  await filtros.getByPlaceholder("Nombre o correo").fill("falla");
  await filtros.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Falla controlada" }),
  ).toBeVisible();
  await expect(page.getByText(/No se encontraron usuarios/)).toHaveCount(0);
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(page.getByText("Recuperada", { exact: true })).toBeVisible();
});
