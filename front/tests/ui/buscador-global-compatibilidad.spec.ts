import { expect, test } from "@playwright/test";

import {
  clienteBuscador,
  prepararBuscadorGlobal,
} from "./soporte/buscador-global";

test("el buscador conserva teclado, debounce y resultados en cada motor", async ({
  page,
}) => {
  await prepararBuscadorGlobal(page);
  await page.goto("/inicio");
  await expect(
    page.getByRole("button", { name: "Buscar en Vektra" }),
  ).toBeVisible();
  await page.keyboard.press("Control+k");
  const campo = page.getByLabel(
    "Nombre, teléfono, tarjeta, dirección, producto o código",
  );
  await expect(campo).toBeFocused();
  await campo.fill(clienteBuscador.telefono);
  await expect(
    page.getByRole("button", {
      name: new RegExp(clienteBuscador.nombreCompleto),
    }),
  ).toBeVisible();
});
