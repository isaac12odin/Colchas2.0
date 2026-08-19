import "dotenv/config";

import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

import {
  asegurarUrlBasePruebas,
  resolverUrlBasePruebas,
} from "./base-pruebas.js";

async function principal() {
  const urlPruebas = resolverUrlBasePruebas();
  const { url, base } = asegurarUrlBasePruebas(urlPruebas);
  const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (!local && process.env.E2E_ALLOW_REMOTE_DATABASE !== "SI")
    throw new Error(
      "La preparación E2E bloqueó PostgreSQL remoto. Use una base local o confirme E2E_ALLOW_REMOTE_DATABASE=SI sobre una base desechable *_test.",
    );

  const administracion = new URL(url);
  administracion.pathname = "/postgres";
  administracion.searchParams.delete("schema");
  const prismaAdmin = new PrismaClient({
    datasources: { db: { url: administracion.toString() } },
  });
  try {
    const existentes = await prismaAdmin.$queryRawUnsafe<
      Array<{ existe: number }>
    >("SELECT 1 AS existe FROM pg_database WHERE datname = $1", base);
    if (!existentes.length) {
      // El nombre ya pasó por una lista cerrada de caracteres; las comillas
      // dobles conservan mayúsculas sin permitir inyección SQL.
      await prismaAdmin.$executeRawUnsafe(`CREATE DATABASE "${base}"`);
      process.stdout.write(`Base exclusiva de pruebas ${base} creada.\n`);
    }
  } finally {
    await prismaAdmin.$disconnect();
  }

  const ejecutable = process.platform === "win32" ? "npx.cmd" : "npx";
  execFileSync(ejecutable, ["prisma", "migrate", "deploy"], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: urlPruebas },
    stdio: "inherit",
  });
}

principal().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
