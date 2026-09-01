import { expect, type Page, type Route, test } from "@playwright/test";
import { leccionesCapacitacion } from "../../modulos/capacitacion/catalogo";
import {
  indicePracticasWeb,
  obtenerPracticaWebSegura,
} from "../../modulos/capacitacion/indicePracticasWeb";
import {
  pasosAtomicosDe,
  totalLeccionesWebConGuion,
} from "../../modulos/capacitacion/guionesAtomicos";

const administrador = {
  id: "simuladores-admin-0001",
  nombre: "Administradora Simuladores",
  correo: "simuladores@nexo.test",
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
  const mutacionesRed: string[] = [];
  await page.route("**/api/**", async (route) => {
    const solicitud = route.request();
    const ruta = new URL(solicitud.url()).pathname;
    if (!["GET", "HEAD", "OPTIONS"].includes(solicitud.method()))
      mutacionesRed.push(`${solicitud.method()} ${ruta}`);
    if (ruta.endsWith("/auth/sesion"))
      return json(route, { usuario: administrador });
    if (ruta.endsWith("/alertas"))
      return json(route, { totales: { total: 0 } });
    return json(route, { error: { mensaje: `Sin mock para ${ruta}` } }, 404);
  });
  await page.goto("/capacitacion");
  return mutacionesRed;
}

test("las 24 prácticas web tienen un guion atómico completo y sin pasos duplicados", () => {
  const leccionesWeb = leccionesCapacitacion.filter((leccion) =>
    Boolean(leccion.rutaReal),
  );

  expect(leccionesWeb).toHaveLength(24);
  expect(totalLeccionesWebConGuion()).toBe(leccionesWeb.length);

  for (const leccion of leccionesWeb) {
    const pasos = pasosAtomicosDe(leccion);
    expect(pasos.length, leccion.id).toBeGreaterThanOrEqual(4);
    expect(new Set(pasos.map((paso) => paso.id)).size, leccion.id).toBe(
      pasos.length,
    );
    for (const paso of pasos) {
      expect(paso.objetivo.control, `${leccion.id}/${paso.id}`).not.toBe("");
      expect(paso.microEjemplo.es, `${leccion.id}/${paso.id}`).not.toBe("");
      expect(paso.verificacion.es, `${leccion.id}/${paso.id}`).not.toBe("");
    }
  }
});

test("el índice ligero de prácticas coincide con el catálogo operativo", () => {
  const catalogo = leccionesCapacitacion
    .filter((leccion): leccion is typeof leccion & { rutaReal: string } =>
      Boolean(leccion.rutaReal),
    )
    .map(({ id, rutaReal, roles }) => ({ id, rutaReal, roles: [...roles] }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const indice = indicePracticasWeb
    .map(({ id, rutaReal, roles }) => ({ id, rutaReal, roles: [...roles] }))
    .sort((a, b) => a.id.localeCompare(b.id));

  expect(indice).toEqual(catalogo);
});

test("el índice rechaza prácticas desconocidas, de otro módulo o de otro rol", () => {
  expect(
    obtenerPracticaWebSegura(
      "clientes-expediente",
      "/clientes/cliente-42",
      "VENDEDOR",
    )?.id,
  ).toBe("clientes-expediente");
  expect(
    obtenerPracticaWebSegura("clientes-expediente", "/ventas", "VENDEDOR"),
  ).toBeNull();
  expect(
    obtenerPracticaWebSegura("seguridad-usuarios", "/usuarios", "VENDEDOR"),
  ).toBeNull();
  expect(
    obtenerPracticaWebSegura("leccion-inventada", "/ventas", "ADMINISTRADOR"),
  ).toBeNull();
});

test("las prácticas web críticas abren exactamente sus módulos operativos", async ({
  page,
}) => {
  const mutacionesRed = await preparar(page);
  const casos = [
    {
      leccion: "Venta de contado o a crédito",
      ruta: "/ventas",
      titulo: "Ventas",
    },
    {
      leccion: "Registrar un abono",
      ruta: "/clientes",
      titulo: "Clientes",
    },
    {
      leccion: "Entregar pedido y generar venta",
      ruta: "/pedidos",
      titulo: "Pedidos",
    },
    {
      leccion: "Devolución sin borrar historial",
      ruta: "/devoluciones",
      titulo: "Devoluciones y cancelaciones",
    },
  ] as const;

  for (const caso of casos) {
    const articulo = page
      .getByRole("heading", { name: caso.leccion, exact: true })
      .locator("xpath=ancestor::article");
    await articulo
      .getByRole("button", { name: "Practicar en la pantalla real" })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`${caso.ruta.replace("/", "\\/")}\\?practica=`),
    );
    await expect(
      page.getByRole("heading", { name: caso.titulo, exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId("entrenador-pantalla-real")).toContainText(
      "GUÍA PASO A PASO · PANTALLA REAL",
    );
    await expect(page.getByTestId("entrenador-pantalla-real")).toContainText(
      "MICROEJEMPLO · NO LO COPIES",
    );
    await page.getByRole("button", { name: "Salir de la práctica" }).click();
    await expect(page).toHaveURL(/\/capacitacion\?pantalla=/);
    await page.goto("/capacitacion");
  }

  expect(mutacionesRed).toEqual([]);
});

test("la práctica móvil sin ruta web conserva su simulador aislado", async ({
  page,
}) => {
  const mutacionesRed = await preparar(page);
  const articulo = page
    .getByRole("heading", { name: "Trabajar sin señal y sincronizar" })
    .locator("xpath=ancestor::article");
  await articulo.getByRole("button").click();
  await page.getByTestId("comenzar-practica-guiada").click();

  await page
    .getByRole("button", { name: "Enviar pendientes de práctica" })
    .click();
  await page
    .getByRole("button", { name: "Conservar folio y enviar a revisión" })
    .click();
  await page.getByRole("button", { name: "Resolver decisión" }).click();
  await expect(page.getByTestId("retroalimentacion-correcta")).toBeVisible();
  expect(mutacionesRed).toEqual([]);
});
