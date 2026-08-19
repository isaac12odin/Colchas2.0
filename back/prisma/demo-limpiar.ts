import "dotenv/config";

import { prisma } from "../src/infraestructura/prisma.js";
import { asegurarEntornoDemo, limpiarDatosDemo } from "./demo-soporte.js";

async function principal() {
  asegurarEntornoDemo();
  const resumen = await limpiarDatosDemo();
  console.info("Datos demo eliminados de forma segura:", resumen);
}

principal()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
