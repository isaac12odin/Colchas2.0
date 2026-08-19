import { PrismaClient } from "@prisma/client";
import { resolverUrlBasePruebas } from "../../scripts/base-pruebas.js";

/** Falla una sola vez y con instrucciones claras si PostgreSQL no está listo. */
export default async function prepararSuiteE2e() {
  const databaseUrl = resolverUrlBasePruebas();
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    throw new Error(
      "PostgreSQL de pruebas no está disponible. Desde la raíz ejecute: npm run db:start:local && npm run db:migrate",
    );
  } finally {
    await prisma.$disconnect();
  }
}
