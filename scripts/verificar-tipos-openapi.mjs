import { readFile } from "node:fs/promises";

import openapiTS, { astToString, COMMENT_HEADER } from "openapi-typescript";
import { format } from "prettier";

const contrato = new URL("../openapi.yaml", import.meta.url);
const destinos = [
  new URL("../front/lib/api-generada.ts", import.meta.url),
  new URL("../movil/src/api-generada.ts", import.meta.url),
];

const nodos = await openapiTS(contrato);
const esperado = await format(`${COMMENT_HEADER}${astToString(nodos)}`, {
  parser: "typescript",
});
const desactualizados = [];

for (const destino of destinos) {
  let actual = "";
  try {
    actual = await readFile(destino, "utf8");
  } catch {
    desactualizados.push(destino.pathname);
    continue;
  }
  if (actual !== esperado) desactualizados.push(destino.pathname);
}

if (desactualizados.length) {
  process.stderr.write(
    `Contratos OpenAPI ausentes o desactualizados:\n${desactualizados.map((ruta) => `- ${ruta}`).join("\n")}\nEjecute npm run openapi:types.\n`,
  );
  process.exitCode = 1;
} else {
  process.stdout.write("Contratos OpenAPI web/móvil sincronizados.\n");
}
