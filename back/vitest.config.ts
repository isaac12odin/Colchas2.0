import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/e2e/**"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL:
        "postgresql://nexo:nexo_local_seguro@localhost:5432/nexo_pruebas?schema=public",
      FRONTEND_URL: "http://localhost:3000",
      JWT_ACCESS_SECRET: "access-de-prueba-con-mas-de-32-caracteres-seguros",
      JWT_REFRESH_SECRET: "refresh-de-prueba-con-mas-de-32-caracteres-seguros",
      FIELD_ENCRYPTION_KEY: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
      SEARCH_HMAC_KEY: "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=",
    },
  },
});
