import { expect, test, type Route } from "@playwright/test";

const administrador = {
  id: "admin-cobranza-web",
  nombre: "Administración Web",
  correo: "admin-web@nexo.test",
  rol: "ADMINISTRADOR",
  debeCambiarContrasena: false,
  mfaHabilitado: true,
};

const estadoCuenta = {
  saldoTotal: 500,
  abonoPeriodico: 150,
  vencido: 50,
  venceHoy: 150,
  cobrarHoy: 200,
  proximoVencimiento: null,
  cuotasVencidas: 1,
  retardosHistoricos: 2,
  diasRetardoActual: 7,
  diasRetardoMaximo: 10,
};

const clienteRuta = {
  id: "cliente-programada-web",
  nombreCompleto: "Laura Programada",
  numeroTarjeta: "WEB-100",
  telefono: "2225550100",
  direccion: "Calle Ruta 10",
  localidad: { nombre: "Centro", estado: "Puebla" },
  orden: 1,
  fueraDeRuta: false,
  saldo: { saldoActual: "500" },
  estadoCuenta,
  visita: null,
  pedidos: [],
  ventas: [],
  evaluacionesRiesgo: [],
};

const clienteExtra = {
  ...clienteRuta,
  id: "cliente-extra-web",
  nombreCompleto: "Rosa Extraordinaria",
  numeroTarjeta: "WEB-200",
  direccion: "Calle Fuera 20",
  fueraDeRuta: true,
};

async function json(route: Route, cuerpo: unknown, estado = 200) {
  await route.fulfill({
    status: estado,
    contentType: "application/json",
    body: JSON.stringify(cuerpo),
  });
}

test("Administración cobra una ruta sólo web y también localiza fuera de ruta", async ({
  page,
}) => {
  let captura: Record<string, unknown> | null = null;
  const rutaWeb = {
    id: "ruta-solo-web",
    nombre: "Ruta administrativa",
    diaSemana: "MARTES",
    cobradorId: null,
    cobrador: null,
    localidades: [],
    clientes: [],
    _count: { clientes: 1 },
  };

  await page.route("**/api/**", async (route) => {
    const solicitud = route.request();
    const url = new URL(solicitud.url());
    if (url.pathname.endsWith("/auth/sesion"))
      return json(route, { usuario: administrador });
    if (url.pathname.endsWith("/alertas"))
      return json(route, { totales: { total: 0 } });
    if (url.pathname.endsWith("/rutas") && solicitud.method() === "GET")
      return json(route, { datos: [rutaWeb] });
    if (url.pathname.endsWith(`/rutas/${rutaWeb.id}/jornada`))
      return json(route, {
        id: rutaWeb.id,
        nombre: rutaWeb.nombre,
        fecha: "2026-08-25T18:00:00.000Z",
        clientes: [clienteRuta],
      });
    if (url.pathname.endsWith(`/rutas/${rutaWeb.id}/clientes-extraordinarios`))
      return json(route, { datos: [clienteExtra] });
    if (
      url.pathname.endsWith(`/rutas/${rutaWeb.id}/visitas`) &&
      solicitud.method() === "POST"
    ) {
      captura = solicitud.postDataJSON();
      return json(route, { visita: { id: "visita-web" }, abono: {} }, 201);
    }
    return json(
      route,
      { error: { mensaje: `Sin mock para ${url.pathname}` } },
      404,
    );
  });

  await page.goto("/rutas");
  await expect(page.getByText("Sólo administración web")).toBeVisible();
  await page.getByRole("button", { name: /Laura Programada/ }).click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo.getByText("Debes cobrar hoy")).toBeVisible();
  await dialogo.getByLabel("¿Cuánto te dio?").fill("125");
  await dialogo.getByLabel("Método").selectOption("TRANSFERENCIA");
  await dialogo.getByLabel("Referencia (opcional)").fill("TR-125");
  await dialogo.getByRole("button", { name: "Guardar" }).click();

  expect(captura).toMatchObject({
    clienteId: clienteRuta.id,
    resultado: "PAGO",
    abono: {
      monto: 125,
      metodo: "TRANSFERENCIA",
      referencia: "TR-125",
    },
  });

  await page.getByRole("button", { name: /Cobro fuera de ruta/ }).click();
  await page
    .getByPlaceholder(/Fuera de ruta/)
    .fill(clienteExtra.nombreCompleto);
  await page.getByRole("button", { name: "Buscar clienta" }).click();
  await page.getByRole("button", { name: /Rosa Extraordinaria/ }).click();
  await expect(page.getByRole("dialog")).toContainText(
    clienteExtra.nombreCompleto,
  );
});
