import { expect, test } from "@playwright/test";

import {
  clienteBuscador,
  prepararBuscadorGlobal,
} from "./soporte/buscador-global";

test("la búsqueda es operable sin desbordarse en móvil y tableta", async ({
  page,
}) => {
  await prepararBuscadorGlobal(page);
  await page.goto("/inicio");
  await page.getByRole("button", { name: "Buscar en Vektra" }).click();
  const dialogo = page.getByRole("dialog", { name: "Buscar en todo Vektra" });
  await expect(dialogo).toBeInViewport();
  await dialogo
    .getByLabel("Nombre, teléfono, tarjeta, dirección, producto o código")
    .fill(clienteBuscador.telefono);
  await expect(
    dialogo.getByRole("button", {
      name: new RegExp(clienteBuscador.nombreCompleto),
    }),
  ).toBeInViewport();
  const medidas = await page.evaluate(() => ({
    documento: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(medidas.documento).toBeLessThanOrEqual(medidas.viewport + 1);
});
