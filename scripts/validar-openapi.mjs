import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { createConfig, lint } from "@redocly/openapi-core";
import { parse } from "yaml";

const rutaContrato = resolve("openapi.yaml");
const fuente = await readFile(rutaContrato, "utf8");
const documento = parse(fuente);

if (documento.openapi !== "3.1.0")
  throw new Error("openapi.yaml debe declarar OpenAPI 3.1.0.");

const rutasCriticas = [
  "/auth/renovar",
  "/clientes/{id}/saldo",
  "/ventas",
  "/abonos/{id}/anular",
  "/proveedores/opciones",
  "/sincronizacion/lotes",
  "/sincronizacion/revisiones/{id}/resolver",
  "/sincronizacion/dispositivos/{id}/reemplazar",
  "/reconciliacion",
];
for (const ruta of rutasCriticas)
  if (!documento.paths?.[ruta])
    throw new Error(`Falta documentar la ruta crítica ${ruta}.`);

const metodosHttp = new Set([
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "options",
  "head",
]);
let operaciones = 0;
for (const [ruta, definicion] of Object.entries(documento.paths ?? {})) {
  for (const [metodo, operacion] of Object.entries(definicion ?? {})) {
    if (!metodosHttp.has(metodo)) continue;
    operaciones += 1;
    if (!operacion.summary)
      throw new Error(`${metodo.toUpperCase()} ${ruta} no tiene summary.`);
    if (!operacion.operationId)
      throw new Error(`${metodo.toUpperCase()} ${ruta} no tiene operationId.`);
    if (!operacion.responses || Object.keys(operacion.responses).length === 0)
      throw new Error(
        `${metodo.toUpperCase()} ${ruta} no documenta responses.`,
      );
  }
}
if (operaciones < 75)
  throw new Error(
    `El contrato perdió cobertura: se esperaban al menos 75 operaciones y hay ${operaciones}.`,
  );

const configuracion = await createConfig({ extends: ["recommended"] });
const problemas = await lint({ ref: rutaContrato, config: configuracion });
const errores = problemas.filter(({ severity }) => severity === "error");
if (errores.length) {
  for (const error of errores)
    console.error(`${error.ruleId}: ${error.message}`);
  throw new Error(`OpenAPI contiene ${errores.length} errores estructurales.`);
}

const excepcionesDocumentadas = new Set([
  // El contrato publica también el servidor local deliberadamente.
  "no-server-example.com",
  // Express registra primero /codigo/:codigo; cambiar ahora rompería clientes.
  "no-ambiguous-paths",
]);
const advertencias = problemas.filter(
  ({ severity, ruleId }) =>
    severity === "warn" && !excepcionesDocumentadas.has(ruleId),
);
if (advertencias.length) {
  for (const advertencia of advertencias)
    console.error(`${advertencia.ruleId}: ${advertencia.message}`);
  throw new Error(
    `OpenAPI contiene ${advertencias.length} recomendaciones pendientes.`,
  );
}
process.stdout.write(
  `OpenAPI válido: ${Object.keys(documento.paths).length} rutas, ${operaciones} operaciones y 0 recomendaciones pendientes.\n`,
);
