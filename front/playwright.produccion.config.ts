import { defineConfig, devices } from "@playwright/test";

const puerto = Number(process.env.PLAYWRIGHT_PRODUCTION_PORT ?? 3200);
const baseURL = `http://127.0.0.1:${puerto}`;

/** Ejecuta exclusivamente contra el artefacto creado por `next build`. */
export default defineConfig({
  testDir: "./tests/produccion",
  fullyParallel: false,
  forbidOnly: true,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report/produccion" }],
  ],
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node .next/standalone/front/server.js",
    env: {
      ...process.env,
      HOSTNAME: "127.0.0.1",
      PORT: String(puerto),
    },
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
