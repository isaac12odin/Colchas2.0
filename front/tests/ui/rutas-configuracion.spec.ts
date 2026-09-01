import { expect, test, type Route } from "@playwright/test";

const administrador = {
  id: "admin-rutas-0001",
  nombre: "Administradora de Rutas",
  correo: "rutas@nexo.test",
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

function estadoCuenta(saldo: number, vencido = 0) {
  return {
    saldoTotal: saldo,
    abonoPeriodico: 100,
    vencido,
    venceHoy: 100,
    cobrarHoy: Math.min(saldo, vencido + 100),
    proximoVencimiento: "2026-08-25T18:00:00.000Z",
    cuotasVencidas: vencido > 0 ? 1 : 0,
    retardosHistoricos: vencido > 0 ? 1 : 0,
    diasRetardoActual: vencido > 0 ? 7 : 0,
    diasRetardoMaximo: vencido > 0 ? 7 : 0,
  };
}

test("elige sólo clientas con saldo y conserva el orden manual de cobranza", async ({
  page,
}) => {
  let cuerpoCreacion: Record<string, unknown> | null = null;
  const localidad = {
    id: "localidad-centro",
    nombre: "Centro",
    estado: "Puebla",
  };
  const saldo = (saldoActual: string) => ({ saldoActual });

  await page.route("**/api/**", async (route) => {
    const solicitud = route.request();
    const ruta = new URL(solicitud.url()).pathname;
    if (ruta.endsWith("/auth/sesion"))
      return json(route, { usuario: administrador });
    if (ruta.endsWith("/alertas"))
      return json(route, { totales: { total: 0 } });
    if (ruta.endsWith("/localidades"))
      return json(route, { datos: [localidad] });
    if (ruta.endsWith("/usuarios"))
      return json(route, {
        datos: [
          {
            id: "cobradora-1",
            nombre: "Ana Cobradora",
            correo: "ana@nexo.test",
            rol: "COBRADOR",
            activo: true,
          },
        ],
      });
    if (ruta.endsWith("/rutas/clientes-con-saldo"))
      return json(route, {
        datos: [
          {
            id: "cliente-ana",
            nombreCompleto: "Ana Saldo",
            numeroTarjeta: "001",
            localidadId: localidad.id,
            localidad,
            saldo: saldo("300"),
            estadoCuenta: estadoCuenta(300, 100),
            evaluacionesRiesgo: [],
          },
          {
            id: "cliente-beatriz",
            nombreCompleto: "Beatriz Saldo",
            numeroTarjeta: "002",
            localidadId: localidad.id,
            localidad,
            saldo: saldo("500"),
            estadoCuenta: estadoCuenta(500, 200),
            evaluacionesRiesgo: [],
          },
          {
            id: "cliente-sin-saldo",
            nombreCompleto: "Carmen Sin Saldo",
            numeroTarjeta: "003",
            localidadId: localidad.id,
            localidad,
            saldo: saldo("0"),
            estadoCuenta: estadoCuenta(0),
            evaluacionesRiesgo: [],
          },
        ],
      });
    if (ruta.endsWith("/rutas") && solicitud.method() === "POST") {
      cuerpoCreacion = solicitud.postDataJSON();
      return json(route, { id: "ruta-creada" }, 201);
    }
    if (ruta.endsWith("/rutas")) return json(route, { datos: [] });
    return json(route, { error: { mensaje: `Sin mock para ${ruta}` } }, 404);
  });

  await page.goto("/rutas");
  await page.getByRole("button", { name: "Nueva ruta" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByLabel("Nombre de ruta").fill("Ruta Centro");
  await dialogo.getByLabel("Cobrador responsable").selectOption("cobradora-1");
  await dialogo.getByRole("checkbox", { name: /Centro.*Puebla/ }).check();

  await expect(dialogo.getByText("Carmen Sin Saldo")).toHaveCount(0);
  await dialogo.getByRole("button", { name: /Ana Saldo/ }).click();
  await dialogo.getByRole("button", { name: /Beatriz Saldo/ }).click();
  await dialogo.getByRole("button", { name: "Subir a Beatriz Saldo" }).click();
  await expect(dialogo.getByText(/2 cliente.*orden exacto/)).toBeVisible();
  await dialogo.getByRole("button", { name: "Guardar" }).click();

  await expect(dialogo).toBeHidden();
  expect(cuerpoCreacion).toMatchObject({
    nombre: "Ruta Centro",
    cobradorId: "cobradora-1",
    localidadIds: [localidad.id],
    clienteIds: ["cliente-beatriz", "cliente-ana"],
    incluirClientesLocalidades: false,
  });
});

test("crea una ruta sólo web sin inventar un cobrador", async ({ page }) => {
  let cuerpoCreacion: Record<string, unknown> | null = null;
  const localidad = {
    id: "localidad-ruta-web",
    nombre: "Centro web",
    estado: "Puebla",
  };
  const cliente = {
    id: "cliente-ruta-web",
    nombreCompleto: "Laura Ruta Web",
    numeroTarjeta: "WEB-001",
    localidadId: localidad.id,
    localidad,
    saldo: { saldoActual: "450" },
    estadoCuenta: estadoCuenta(450),
    evaluacionesRiesgo: [],
  };

  await page.route("**/api/**", async (route) => {
    const solicitud = route.request();
    const ruta = new URL(solicitud.url()).pathname;
    if (ruta.endsWith("/auth/sesion"))
      return json(route, { usuario: administrador });
    if (ruta.endsWith("/alertas"))
      return json(route, { totales: { total: 0 } });
    if (ruta.endsWith("/localidades"))
      return json(route, { datos: [localidad] });
    if (ruta.endsWith("/usuarios")) return json(route, { datos: [] });
    if (ruta.endsWith("/rutas/clientes-con-saldo"))
      return json(route, { datos: [cliente] });
    if (ruta.endsWith("/rutas") && solicitud.method() === "POST") {
      cuerpoCreacion = solicitud.postDataJSON();
      return json(route, { id: "ruta-web-creada" }, 201);
    }
    if (ruta.endsWith("/rutas")) return json(route, { datos: [] });
    return json(route, { error: { mensaje: `Sin mock para ${ruta}` } }, 404);
  });

  await page.goto("/rutas");
  await page.getByRole("button", { name: "Nueva ruta" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByLabel("Nombre de ruta").fill("Ruta administrativa web");
  await expect(dialogo.getByText(/No aparecerá en ningún móvil/)).toBeVisible();
  await dialogo.getByRole("checkbox", { name: /Centro web/ }).check();
  await dialogo.getByRole("button", { name: /Laura Ruta Web/ }).click();
  await dialogo.getByRole("button", { name: "Guardar" }).click();

  expect(cuerpoCreacion).toMatchObject({
    nombre: "Ruta administrativa web",
    cobradorId: null,
    localidadIds: [localidad.id],
    clienteIds: [cliente.id],
  });
});

test("la práctica guía la selección y el orden sin escribir la ruta en la API", async ({
  page,
}) => {
  const escriturasRed: string[] = [];
  await page.addInitScript(() => {
    const estado = window as unknown as {
      __mutacionesPracticaPrueba?: unknown[];
    };
    estado.__mutacionesPracticaPrueba = [];
    window.addEventListener(
      "nexo:capacitacion:mutacion-local",
      (evento: Event) =>
        estado.__mutacionesPracticaPrueba?.push(
          (evento as CustomEvent<unknown>).detail,
        ),
    );
  });
  const localidad = {
    id: "localidad-practica-centro",
    nombre: "Centro",
    estado: "Puebla",
  };
  await page.route("**/api/**", async (route) => {
    const solicitud = route.request();
    const ruta = new URL(solicitud.url()).pathname;
    if (!["GET", "HEAD", "OPTIONS"].includes(solicitud.method()))
      escriturasRed.push(`${solicitud.method()} ${ruta}`);
    if (ruta.endsWith("/auth/sesion"))
      return json(route, { usuario: administrador });
    if (ruta.endsWith("/alertas"))
      return json(route, { totales: { total: 0 } });
    if (ruta.endsWith("/localidades"))
      return json(route, { datos: [localidad] });
    if (ruta.endsWith("/usuarios"))
      return json(route, {
        datos: [
          {
            id: "cobradora-practica",
            nombre: "Laura Gómez",
            correo: "laura@nexo.test",
            rol: "COBRADOR",
            activo: true,
          },
        ],
      });
    if (ruta.endsWith("/rutas/clientes-con-saldo"))
      return json(route, {
        datos: [
          {
            id: "cliente-practica-ana",
            nombreCompleto: "Ana Saldo",
            numeroTarjeta: "001",
            localidadId: localidad.id,
            localidad,
            saldo: { saldoActual: "350" },
            estadoCuenta: estadoCuenta(350, 100),
            evaluacionesRiesgo: [],
          },
          {
            id: "cliente-practica-rosa",
            nombreCompleto: "Rosa Saldo",
            numeroTarjeta: "002",
            localidadId: localidad.id,
            localidad,
            saldo: { saldoActual: "500" },
            estadoCuenta: estadoCuenta(500, 200),
            evaluacionesRiesgo: [],
          },
          {
            id: "cliente-practica-sin-saldo",
            nombreCompleto: "Clienta sin saldo",
            numeroTarjeta: "003",
            localidadId: localidad.id,
            localidad,
            saldo: { saldoActual: "0" },
            estadoCuenta: estadoCuenta(0),
            evaluacionesRiesgo: [],
          },
        ],
      });
    if (ruta.endsWith("/rutas")) return json(route, { datos: [] });
    return json(route, { error: { mensaje: `Sin mock para ${ruta}` } }, 404);
  });

  await page.goto("/rutas?practica=rutas-configuracion");
  const entrenador = page.getByTestId("entrenador-pantalla-real");
  await expect(entrenador).toContainText("PASO 1 DE 11");

  async function completar(accion: () => Promise<unknown>) {
    await page.getByTestId("mostrar-objetivo-practica").click();
    await accion();
    await expect(page.getByTestId("accion-real-detectada")).toBeVisible();
    await page.getByTestId("continuar-practica-real").click();
  }

  await completar(() =>
    page.getByRole("button", { name: "Nueva ruta" }).click(),
  );
  const dialogo = page.getByRole("dialog");
  await completar(async () => {
    const campo = dialogo.getByLabel("Nombre de ruta");
    await campo.fill("Ruta Centro - Martes");
    await campo.press("Enter");
  });
  await completar(() =>
    dialogo.getByLabel("Día de cobranza").selectOption("MARTES"),
  );
  await completar(() =>
    dialogo
      .getByLabel("Cobrador responsable")
      .selectOption("cobradora-practica"),
  );
  await completar(async () => {
    const campo = dialogo.getByPlaceholder("Buscar localidad o estado");
    await campo.fill("Centro");
    await campo.press("Enter");
  });
  await completar(() =>
    dialogo.getByRole("checkbox", { name: /Centro.*Puebla/ }).check(),
  );
  await completar(async () => {
    const campo = dialogo.getByPlaceholder(
      "Buscar por nombre, tarjeta o localidad",
    );
    await campo.fill("Saldo");
    await campo.press("Enter");
  });
  await completar(() =>
    dialogo.getByRole("button", { name: /Ana Saldo/ }).click(),
  );
  await completar(() =>
    dialogo.getByRole("button", { name: /Rosa Saldo/ }).click(),
  );
  await completar(() =>
    dialogo.getByRole("button", { name: "Subir a Rosa Saldo" }).click(),
  );

  await page.getByTestId("mostrar-objetivo-practica").click();
  await dialogo.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByTestId("accion-real-detectada")).toBeVisible();
  await expect(entrenador).toContainText(
    "La ruta queda simulada sólo en este navegador",
  );

  const mutacionesLocales = await page.evaluate(
    () =>
      (
        window as unknown as {
          __mutacionesPracticaPrueba?: Array<Record<string, unknown>>;
        }
      ).__mutacionesPracticaPrueba ?? [],
  );
  expect(mutacionesLocales).toMatchObject([
    {
      metodo: "POST",
      ruta: "/rutas",
      cuerpo: {
        nombre: "Ruta Centro - Martes",
        diaSemana: "MARTES",
        cobradorId: "cobradora-practica",
        localidadIds: [localidad.id],
        clienteIds: ["cliente-practica-rosa", "cliente-practica-ana"],
        incluirClientesLocalidades: false,
      },
    },
  ]);
  expect(escriturasRed).toEqual([]);
});
