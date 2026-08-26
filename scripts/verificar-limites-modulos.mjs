import { readdir, readFile } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";

const raiz = resolve(".");
const extensiones = new Set([".ts", ".tsx", ".mjs"]);
const archivos = [];

async function recorrer(directorio) {
  for (const entrada of await readdir(directorio, { withFileTypes: true })) {
    if (
      entrada.name === "node_modules" ||
      entrada.name === ".next" ||
      entrada.name === ".expo" ||
      entrada.name === "dist" ||
      entrada.name === "playwright-report" ||
      entrada.name === "test-results"
    )
      continue;
    const ruta = resolve(directorio, entrada.name);
    if (entrada.isDirectory()) await recorrer(ruta);
    else if (extensiones.has(extname(entrada.name))) archivos.push(ruta);
  }
}

for (const directorio of ["back/src", "front", "movil", "scripts"])
  await recorrer(resolve(directorio));

const permitidosBackend = new Set([
  "clientes->cobranza",
  "clientes->ventas",
  "cobranza->cortes",
  "devoluciones->cobranza",
  "devoluciones->cortes",
  "pedidos->ventas",
  "rutas->clientes",
  "rutas->cobranza",
  "sincronizacion->cobranza",
  "sincronizacion->pedidos",
  "sincronizacion->rutas",
  "sincronizacion->ventas",
  "ventas->cobranza",
  "ventas->cortes",
]);
const excepcionesTamano = new Set([
  "front/lib/api-generada.ts",
  "front/modulos/capacitacion/MotorCapacitacion.tsx",
  "front/modulos/capacitacion/catalogo.ts",
  "front/modulos/capacitacion/simuladores/SimuladorCriticoWeb.tsx",
  "movil/app/(app)/capacitacion.tsx",
  "movil/src/api-generada.ts",
  "movil/src/modulos/capacitacion/catalogo.ts",
  "movil/src/modulos/capacitacion/simuladores/SimuladorCriticoMovil.tsx",
]);
const problemas = [];

for (const archivo of archivos) {
  const ruta = relative(raiz, archivo).split(sep).join("/");
  const contenido = await readFile(archivo, "utf8");
  const lineas = contenido.split("\n").length;
  if (lineas > 700 && !excepcionesTamano.has(ruta))
    problemas.push(`${ruta}: ${lineas} líneas exceden el límite de 700.`);

  if (
    /^back\/src\/(compartido|configuracion|infraestructura|seguridad)\//.test(
      ruta,
    )
  )
    if (/from ["'][^"']*\/modulos\//.test(contenido))
      problemas.push(`${ruta}: una capa base no puede depender de módulos.`);

  const moduloBackend = ruta.match(/^back\/src\/modulos\/([^/]+)\//)?.[1];
  if (moduloBackend) {
    for (const coincidencia of contenido.matchAll(
      /from ["']\.\.\/([^/.]+)\/[^"']+["']/g,
    )) {
      const destino = coincidencia[1];
      if (
        destino !== moduloBackend &&
        !permitidosBackend.has(`${moduloBackend}->${destino}`)
      )
        problemas.push(
          `${ruta}: dependencia ${moduloBackend}->${destino} no está declarada.`,
        );
    }
  }

  if (/^front\/lib\//.test(ruta) && /from ["']@\/app\//.test(contenido))
    problemas.push(`${ruta}: front/lib no puede depender de páginas.`);
  if (
    /^movil\/src\/(infraestructura|utilidades)\//.test(ruta) &&
    /from ["'][^"']*\/app\//.test(contenido)
  )
    problemas.push(`${ruta}: infraestructura móvil no puede depender de app/.`);
}

if (problemas.length) {
  for (const problema of problemas) console.error(problema);
  throw new Error(`Se detectaron ${problemas.length} violaciones modulares.`);
}
process.stdout.write(
  `Límites modulares válidos en ${archivos.length} archivos fuente.\n`,
);
