import { expect, test, type Page, type Route } from "@playwright/test";

const admin = {
  id: "00000000-0000-4000-8000-000000000001",
  nombre: "Administradora Seguridad",
  correo: "admin-seguridad@nexo.test",
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

async function sesionBasica(page: Page, usuario = admin) {
  await page.route("**/api/**", async (route) => {
    const ruta = new URL(route.request().url()).pathname;
    if (ruta.endsWith("/auth/sesion")) return json(route, { usuario });
    if (ruta.endsWith("/alertas"))
      return json(route, { totales: { total: 0 } });
    return json(route, { error: { mensaje: `Sin mock para ${ruta}` } }, 404);
  });
}

test("el perfil muestra claves y genera una contraseña sencilla confirmada", async ({
  page,
}) => {
  await sesionBasica(page);
  await page.goto("/perfil");

  await page
    .getByRole("button", { name: "Generar y confirmar clave segura" })
    .click();
  const nueva = page.getByLabel("Nueva contraseña (mínimo 6)");
  const confirmacion = page.getByLabel("Confirmar nueva contraseña");
  const valor = await nueva.inputValue();
  expect(valor).toHaveLength(8);
  expect(valor).toMatch(/[a-z]/);
  expect(valor).toMatch(/[A-Z]/);
  expect(valor).toMatch(/\d/);
  await expect(confirmacion).toHaveValue(valor);

  await nueva
    .locator("xpath=..")
    .getByRole("button", { name: "Mostrar clave" })
    .click();
  await expect(nueva).toHaveAttribute("type", "text");
});

test("administración abre restablecimiento ajeno con generador y confirmación", async ({
  page,
}) => {
  const objetivo = {
    id: "00000000-0000-4000-8000-000000000002",
    nombre: "Cobrador Seguridad",
    correo: "cobrador@nexo.test",
    rol: "COBRADOR",
    activo: true,
    ultimoAcceso: null,
    debeCambiarContrasena: false,
  };
  await page.route("**/api/**", async (route) => {
    const ruta = new URL(route.request().url()).pathname;
    if (ruta.endsWith("/auth/sesion")) return json(route, { usuario: admin });
    if (ruta.endsWith("/alertas"))
      return json(route, { totales: { total: 0 } });
    if (ruta.endsWith("/usuarios"))
      return json(route, {
        datos: [{ ...admin, activo: true, ultimoAcceso: null }, objetivo],
      });
    return json(route, { error: { mensaje: `Sin mock para ${ruta}` } }, 404);
  });
  await page.goto("/usuarios");

  const fila = page.getByRole("row").filter({ hasText: objetivo.correo });
  await fila.getByRole("button", { name: "Cambiar contraseña" }).click();
  const dialogo = page.getByRole("dialog");
  await expect(
    dialogo.getByRole("heading", { name: /Restablecer contraseña/ }),
  ).toBeVisible();
  await dialogo.getByRole("button", { name: "Generar clave segura" }).click();
  const nueva = dialogo.getByLabel("Nueva contraseña");
  const confirmacion = dialogo.getByLabel("Confirmar contraseña");
  const valor = await nueva.inputValue();
  await expect(confirmacion).toHaveValue(valor);
  expect(valor).toMatch(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/);
});

const cliente = {
  id: "10000000-0000-4000-8000-000000000001",
  nombreCompleto: "María Editable",
  telefono: "2221234567",
  direccion: "Calle Reforma 42",
  numeroTarjeta: "ED-42",
  limiteCredito: "5000",
  notas: "Cliente de prueba",
  localidad: {
    id: "20000000-0000-4000-8000-000000000001",
    nombre: "San Miguel",
    estado: "Puebla",
  },
  saldo: {
    saldoActual: "500",
    vencidoActual: "0",
    totalCargos: "500",
    totalAbonos: "0",
  },
  acuerdoPago: null,
  estadoCuenta: {
    saldoTotal: 500,
    abonoPeriodico: 0,
    vencido: 0,
    venceHoy: 0,
    cobrarHoy: 0,
    proximoVencimiento: null,
    cuotasVencidas: 0,
    retardosHistoricos: 0,
    diasRetardoActual: 0,
    diasRetardoMaximo: 0,
    vencimientos: [],
  },
  evaluacionesRiesgo: [],
  ventas: [],
  abonos: [],
  pedidos: [],
  movimientosSaldo: [],
};

async function prepararCliente(page: Page, rol: "ADMINISTRADOR" | "VENDEDOR") {
  await page.route("**/api/**", async (route) => {
    const ruta = new URL(route.request().url()).pathname;
    if (ruta.endsWith("/auth/sesion"))
      return json(route, { usuario: { ...admin, rol } });
    if (ruta.endsWith("/alertas"))
      return json(route, { totales: { total: 0 } });
    if (ruta.endsWith(`/clientes/${cliente.id}`)) return json(route, cliente);
    if (ruta.endsWith("/localidades"))
      return json(route, { datos: [cliente.localidad] });
    return json(route, { error: { mensaje: `Sin mock para ${ruta}` } }, 404);
  });
}

test("el vendedor entra directo a editar contacto sin controles financieros", async ({
  page,
}) => {
  await prepararCliente(page, "VENDEDOR");
  await page.goto(`/clientes/${cliente.id}?accion=editar`);
  const dialogo = page.getByRole("dialog");
  await expect(
    dialogo.getByRole("heading", { name: "Editar cliente" }),
  ).toBeVisible();
  await expect(dialogo.getByLabel("Nombre completo")).toHaveValue(
    cliente.nombreCompleto,
  );
  await expect(dialogo.getByLabel("Número de tarjeta")).toHaveValue("ED-42");
  await expect(dialogo.getByLabel("Límite de crédito")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Ajustar saldo" })).toHaveCount(
    0,
  );
});

test("administración abre el ajuste protegido y conserva el saldo visible", async ({
  page,
}) => {
  await prepararCliente(page, "ADMINISTRADOR");
  await page.goto(`/clientes/${cliente.id}?accion=saldo`);
  const dialogo = page.getByRole("dialog");
  await expect(
    dialogo.getByRole("heading", { name: /Ajustar saldo/ }),
  ).toBeVisible();
  await expect(dialogo.getByLabel("Saldo actual")).toHaveValue("500.00");
  await expect(
    dialogo.getByText("Corrección financiera auditable"),
  ).toBeVisible();
  const confirmacion = dialogo.getByLabel("Confirma con tu contraseña");
  await expect(confirmacion).toHaveAttribute("type", "password");
  await dialogo.getByRole("button", { name: "Mostrar clave" }).click();
  await expect(confirmacion).toHaveAttribute("type", "text");
});
