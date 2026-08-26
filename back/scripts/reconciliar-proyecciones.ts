import { prisma } from "../src/infraestructura/prisma.js";
import { reconciliarProyecciones } from "../src/modulos/reconciliacion/servicio.js";

async function principal() {
  const resultado = await reconciliarProyecciones();
  process.stdout.write(`${JSON.stringify(resultado, null, 2)}\n`);
  if (resultado.estado !== "INTEGRO") process.exitCode = 2;
}

principal()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
