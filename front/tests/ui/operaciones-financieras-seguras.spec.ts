import { expect, test, type Page, type Route } from "@playwright/test";

const administrador = {
  id: "00000000-0000-4000-8000-000000000001",
  nombre: "Administradora Financiera",
  correo: "admin-finanzas@nexo.test",
  rol: "ADMINISTRADOR",
  debeCambiarContrasena: false,
  mfaHabilitado: true,
};

const operador = {
  id: administrador.id,
  nombre: administrador.nombre,
  rol: "ADMINISTRADOR",
};

const operadoresCaja = [
  operador,
  {
    id: "00000000-0000-4000-8000-000000000002",
    nombre: "Contadora Financiera",
    rol: "CONTABLE",
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    nombre: "Vendedor Mostrador",
    rol: "VENDEDOR",
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    nombre: "Cobrador de Ruta",
    rol: "COBRADOR",
  },
];

const paginaVacia = {
  datos: [],
  paginacion: { pagina: 1, limite: 15, total: 0, totalPaginas: 0 },
};
const pngUnPixel = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

async function json(route: Route, cuerpo: unknown, estado = 200) {
  await route.fulfill({
    status: estado,
    contentType: "application/json",
    body: JSON.stringify(cuerpo),
  });
}

async function responderBase(
  route: Route,
  responder: (route: Route, ruta: string) => Promise<boolean>,
) {
  const ruta = new URL(route.request().url()).pathname;
  if (ruta.endsWith("/auth/sesion")) {
    await json(route, { usuario: administrador });
    return;
  }
  if (ruta.endsWith("/alertas")) {
    await json(route, { totales: { total: 0 } });
    return;
  }
  if (await responder(route, ruta)) return;
  await json(
    route,
    { error: { codigo: "NO_MOCK", mensaje: `Sin mock para ${ruta}` } },
    404,
  );
}

const calculoCorte = {
  fecha: "2026-09-01",
  operador,
  cerrado: null,
  sistema: {
    efectivo: 500,
    transferencia: 200,
    tarjeta: 100,
    otro: 0,
    total: 800,
  },
  abonos: { cantidad: 4, total: 500 },
  ventasContado: { cantidad: 1, total: 300 },
  entregas: { cantidad: 2 },
  reembolsos: { cantidad: 0, total: 0 },
};

async function prepararCortes(
  page: Page,
  alCerrar?: (route: Route) => Promise<void>,
) {
  await page.route("**/api/**", (route) =>
    responderBase(route, async (actual, ruta) => {
      if (ruta.endsWith("/cortes/operadores")) {
        await json(actual, { datos: operadoresCaja });
        return true;
      }
      if (ruta.endsWith("/cortes/previsualizar")) {
        await json(actual, calculoCorte);
        return true;
      }
      if (ruta.endsWith("/cortes") && actual.request().method() === "POST") {
        if (alCerrar) await alCerrar(actual);
        else await json(actual, { folio: "CC-PRUEBA", diferencia: "0" }, 201);
        return true;
      }
      if (ruta.endsWith("/cortes")) {
        await json(actual, paginaVacia);
        return true;
      }
      return false;
    }),
  );
}

test("el corte permite identificar al operador real y su rol", async ({
  page,
}) => {
  await prepararCortes(page);
  await page.goto("/cortes");

  const selector = page.getByLabel("Operador real de caja");
  await expect(selector).toBeVisible();
  expect(await selector.locator("option").allTextContents()).toEqual([
    "Administradora Financiera · administrador",
    "Contadora Financiera · contable",
    "Vendedor Mostrador · vendedor",
    "Cobrador de Ruta · cobrador",
  ]);
});

test("el modal financiero anuncia su título, atrapa el foco y lo restaura", async ({
  page,
}) => {
  await prepararCortes(page);
  await page.goto("/cortes");

  const abrir = page.getByRole("button", { name: "Firmar cierre" });
  await abrir.click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo).toHaveAttribute("aria-modal", "true");
  await expect(dialogo).toHaveAttribute("aria-labelledby", /.+/);
  expect(
    await dialogo.evaluate((elemento) => {
      const id = elemento.getAttribute("aria-labelledby");
      return id ? document.getElementById(id)?.textContent : null;
    }),
  ).toMatch(/Cerrar jornada/);

  const cerrar = dialogo.locator('button[aria-label^="Cerrar "]');
  await expect(cerrar).toBeFocused();
  const ultimo = dialogo.getByRole("button", { name: "Firmar y cerrar" });
  await ultimo.focus();
  await page.keyboard.press("Tab");
  await expect(cerrar).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(ultimo).toBeFocused();

  await dialogo.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialogo).toBeHidden();
  await expect(abrir).toBeFocused();
});

test("el corte acepta un solo envío, no se cierra durante la firma y confirma folio", async ({
  page,
}) => {
  let solicitudes = 0;
  let liberar!: () => void;
  const espera = new Promise<void>((resolver) => {
    liberar = resolver;
  });
  await prepararCortes(page, async (route) => {
    solicitudes += 1;
    await espera;
    await json(
      route,
      {
        folio: "CC-20260901-SEGURO",
        diferencia: "0",
      },
      201,
    );
  });
  await page.goto("/cortes");
  await page.getByRole("button", { name: "Firmar cierre" }).click();
  const dialogo = page.getByRole("dialog");
  const fecha = await page.getByLabel("Fecha operativa").inputValue();
  await dialogo.getByLabel("Efectivo declarado").fill("500");
  await dialogo.getByLabel("Transferencia declarado").fill("200");
  await dialogo.getByLabel("Tarjeta declarado").fill("100");
  await dialogo
    .getByLabel("Nombre completo de quien firma")
    .fill("Administradora Financiera");
  await dialogo.getByLabel("Confirmación exacta").fill(`CERRAR ${fecha}`);

  const confirmar = dialogo.getByRole("button", { name: "Firmar y cerrar" });
  await confirmar.evaluate((boton: HTMLButtonElement) => {
    boton.click();
    boton.click();
  });
  await expect.poll(() => solicitudes).toBe(1);
  await expect(dialogo).toHaveAttribute("aria-busy", "true");
  await expect(
    dialogo.locator('[data-capacitacion="cortes.cierre.guardar"]'),
  ).toBeDisabled();
  await expect(dialogo.locator('button[aria-label^="Cerrar "]')).toBeDisabled();

  await page.locator("[data-modal-fondo]").click({ force: true });
  await page.keyboard.press("Escape");
  await expect(dialogo).toBeVisible();
  expect(solicitudes).toBe(1);

  liberar();
  await expect(page.getByTestId("folio-corte-confirmado")).toHaveText(
    "CC-20260901-SEGURO",
  );
  await expect(
    dialogo.getByText("La jornada quedó cerrada y firmada."),
  ).toBeVisible();
});

const venta = {
  id: "10000000-0000-4000-8000-000000000001",
  folio: "V-DEV-001",
  estado: "CONFIRMADA",
  total: "100",
  fechaVenta: "2026-09-01T12:00:00.000Z",
  cliente: {
    nombreCompleto: "Cliente Devolución",
    saldo: { saldoActual: "100" },
  },
  detalles: [
    {
      id: "20000000-0000-4000-8000-000000000001",
      productoNombre: "Colcha devolución",
      productoSku: "COL-DEV-01",
      cantidad: 1,
      precioUnitario: "100",
    },
  ],
  planPago: { cuotas: [{ monto: "100", montoPagado: "0" }] },
  devoluciones: [],
};

async function prepararDevoluciones(
  page: Page,
  alRegistrar: (route: Route) => Promise<void>,
) {
  await page.route("**/api/**", (route) =>
    responderBase(route, async (actual, ruta) => {
      if (ruta.endsWith("/cortes/operadores")) {
        await json(actual, { datos: [operador] });
        return true;
      }
      if (ruta.endsWith(`/ventas/${venta.id}`)) {
        await json(actual, venta);
        return true;
      }
      if (ruta.endsWith("/ventas")) {
        await json(actual, {
          datos: [venta],
          paginacion: { ...paginaVacia.paginacion, total: 1, totalPaginas: 1 },
        });
        return true;
      }
      if (
        ruta.endsWith("/devoluciones") &&
        actual.request().method() === "POST"
      ) {
        await alRegistrar(actual);
        return true;
      }
      if (ruta.endsWith("/devoluciones")) {
        await json(actual, paginaVacia);
        return true;
      }
      return false;
    }),
  );
}

async function llenarDevolucion(page: Page) {
  await page.getByRole("button", { name: "Devolución" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByRole("button", { name: /V-DEV-001/ }).click();
  await dialogo.getByLabel("Cantidad").fill("1");
  await dialogo
    .getByLabel("Motivo detallado")
    .fill("Producto con defecto visible");
  await dialogo.getByLabel(/Fotografía de evidencia/).setInputFiles({
    name: "evidencia.png",
    mimeType: "image/png",
    buffer: pngUnPixel,
  });
  return dialogo;
}

test("la devolución bloquea envíos y cierres repetidos hasta mostrar su folio", async ({
  page,
}) => {
  let solicitudes = 0;
  let liberar!: () => void;
  const espera = new Promise<void>((resolver) => {
    liberar = resolver;
  });
  await prepararDevoluciones(page, async (route) => {
    solicitudes += 1;
    await espera;
    await json(
      route,
      {
        id: "30000000-0000-4000-8000-000000000001",
        folio: "D-SEGURO-001",
        tipo: "PARCIAL",
        totalDevuelto: "100",
        aplicadoSaldo: "100",
        montoReembolsado: "0",
      },
      201,
    );
  });
  await page.goto("/devoluciones");
  const dialogo = await llenarDevolucion(page);
  const confirmar = dialogo.getByRole("button", { name: "Confirmar reversa" });
  await confirmar.evaluate((boton: HTMLButtonElement) => {
    boton.click();
    boton.click();
  });

  await expect.poll(() => solicitudes).toBe(1);
  await expect(
    dialogo.locator('[data-capacitacion="devoluciones.guardar"]'),
  ).toBeDisabled();
  await page.locator("[data-modal-fondo]").click({ force: true });
  await page.keyboard.press("Escape");
  await expect(dialogo).toBeVisible();

  liberar();
  await expect(page.getByTestId("folio-devolucion-confirmada")).toHaveText(
    "D-SEGURO-001",
  );
  await expect(dialogo.getByText("Venta relacionada:")).toBeVisible();
  expect(solicitudes).toBe(1);
});

test("un error conserva íntegros los datos de la devolución para reintentar", async ({
  page,
}) => {
  await prepararDevoluciones(page, async (route) => {
    await json(
      route,
      {
        error: {
          codigo: "CONFLICTO_OPERATIVO",
          mensaje: "La venta cambió; revise e intente de nuevo.",
        },
      },
      409,
    );
  });
  await page.goto("/devoluciones");
  const dialogo = await llenarDevolucion(page);
  await dialogo.getByRole("button", { name: "Confirmar reversa" }).click();

  await expect(dialogo.getByRole("alert")).toContainText(
    "La venta cambió; revise e intente de nuevo.",
  );
  await expect(dialogo.getByLabel("Cantidad")).toHaveValue("1");
  await expect(dialogo.getByLabel("Motivo detallado")).toHaveValue(
    "Producto con defecto visible",
  );
  await expect(
    dialogo.getByRole("button", { name: "Confirmar reversa" }),
  ).toBeEnabled();
});
