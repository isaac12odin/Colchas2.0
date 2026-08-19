import "dotenv/config";

import { defineConfig } from "vitest/config";
import { resolverUrlBasePruebas } from "./scripts/base-pruebas.js";

const databaseUrlPruebas = resolverUrlBasePruebas();

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/e2e/**/*.e2e.test.ts"],
    globalSetup: ["tests/e2e/global-setup.ts"],
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 30_000,
    hookTimeout: 30_000,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: databaseUrlPruebas,
      FRONTEND_URL: "http://localhost:3000",
      JWT_ACCESS_SECRET:
        process.env.JWT_ACCESS_SECRET ??
        "access-e2e-local-con-mas-de-32-caracteres-seguros",
      JWT_REFRESH_SECRET:
        process.env.JWT_REFRESH_SECRET ??
        "refresh-e2e-local-con-mas-de-32-caracteres-seguros",
      FIELD_ENCRYPTION_KEY:
        process.env.FIELD_ENCRYPTION_KEY ??
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
      E2E_CONFIRM_DATABASE: process.env.E2E_CONFIRM_DATABASE ?? "NO",
      E2E_ALLOW_REMOTE_DATABASE: process.env.E2E_ALLOW_REMOTE_DATABASE ?? "NO",
    },
  },
});
