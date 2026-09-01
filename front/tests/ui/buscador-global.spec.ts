import { expect, test } from "@playwright/test";

import {
  clienteBuscador,
  prepararBuscadorGlobal,
  productoBuscador,
  type RolBuscador,
} from "./soporte/buscador-global";

test("abre con Ctrl/Cmd+K, enfoca la captura y restaura el foco", async ({
  page,
}) => {
  await prepararBuscadorGlobal(page);
  await page.goto("/inicio");
  const boton = page.getByRole("button", { name: "Buscar en Vektra" });
  await boton.focus();

  await page.keyboard.press("Control+k");
  const campo = page.getByLabel(
    "Nombre, teléfono, tarjeta, dirección, producto o código",
  );
  await expect(campo).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(boton).toBeFocused();

  await page.keyboard.press("Meta+k");
  await expect(campo).toBeFocused();
});

test("encuentra la misma clienta por teléfono, tarjeta y dirección", async ({
  page,
}) => {
  const estado = await prepararBuscadorGlobal(page);
  await page.goto("/inicio");
  await page.getByRole("button", { name: "Buscar en Vektra" }).click();
  const campo = page.getByLabel(
    "Nombre, teléfono, tarjeta, dirección, producto o código",
  );

  for (const termino of [
    clienteBuscador.telefono,
    clienteBuscador.numeroTarjeta!,
    clienteBuscador.direccion,
  ]) {
    await campo.fill(termino);
    await expect(
      page.getByRole("button", {
        name: new RegExp(clienteBuscador.nombreCompleto),
      }),
    ).toBeVisible();
    await expect.poll(() => estado.consultasClientes.at(-1)).toBe(termino);
  }

  await page
    .getByRole("button", { name: new RegExp(clienteBuscador.nombreCompleto) })
    .click();
  await expect(page).toHaveURL(`/clientes/${clienteBuscador.id}`);
  await expect(
    page.getByRole("heading", { name: clienteBuscador.nombreCompleto }),
  ).toBeVisible();
});

test("abre un producto con el SKU precargado en inventario", async ({
  page,
}) => {
  const estado = await prepararBuscadorGlobal(page, "ADMINISTRADOR");
  await page.goto("/inicio");
  await expect(
    page.getByRole("button", { name: "Buscar en Vektra" }),
  ).toBeVisible();
  await page.keyboard.press("Control+k");
  await page
    .getByLabel("Nombre, teléfono, tarjeta, dirección, producto o código")
    .fill(productoBuscador.sku);
  await page
    .getByRole("button", { name: new RegExp(productoBuscador.nombre) })
    .click();

  await expect(page).toHaveURL(
    new RegExp(`/inventario\\?buscar=${productoBuscador.sku}`),
  );
  await expect(
    page.getByPlaceholder("Producto, marca, SKU o código"),
  ).toHaveValue(productoBuscador.sku);
  await expect
    .poll(() => estado.consultasProductos.at(-1))
    .toBe(productoBuscador.sku);
});

for (const caso of [
  { rol: "ADMINISTRADOR" as RolBuscador, consultaProducto: true },
  { rol: "CONTABLE" as RolBuscador, consultaProducto: true },
  { rol: "VENDEDOR" as RolBuscador, consultaProducto: false },
]) {
  test(`respeta el alcance de búsqueda para ${caso.rol.toLowerCase()}`, async ({
    page,
  }) => {
    const estado = await prepararBuscadorGlobal(page, caso.rol);
    await page.goto("/inicio");
    await page.getByRole("button", { name: "Buscar en Vektra" }).click();
    await page
      .getByLabel("Nombre, teléfono, tarjeta, dirección, producto o código")
      .fill(productoBuscador.sku);

    if (caso.consultaProducto) {
      await expect(
        page.getByRole("button", { name: new RegExp(productoBuscador.nombre) }),
      ).toBeVisible();
      await expect.poll(() => estado.consultasProductos.length).toBe(1);
    } else {
      await expect(
        page.getByText("No encontramos coincidencias"),
      ).toBeVisible();
      expect(estado.consultasProductos).toEqual([]);
    }
  });
}
