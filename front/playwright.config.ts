import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";
const omitirServidor = process.env.PLAYWRIGHT_SKIP_WEBSERVER === "SI";

export default defineConfig({
  testDir: "./tests/ui",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium-escritorio",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox-escritorio",
      use: { ...devices["Desktop Firefox"] },
      testMatch: /(compatibilidad|buscador-global-compatibilidad)\.spec\.ts/,
    },
    {
      name: "webkit-escritorio",
      use: { ...devices["Desktop Safari"] },
      testMatch: /(compatibilidad|buscador-global-compatibilidad)\.spec\.ts/,
    },
    {
      name: "android-grande",
      use: { ...devices["Pixel 7"] },
      testMatch: /(responsiva|buscador-global-responsiva)\.spec\.ts/,
    },
    {
      name: "android-pequeno",
      use: { ...devices["Pixel 5"] },
      testMatch: /(responsiva|buscador-global-responsiva)\.spec\.ts/,
    },
    {
      name: "iphone-pequeno",
      use: { ...devices["iPhone SE"] },
      testMatch: /(responsiva|buscador-global-responsiva)\.spec\.ts/,
    },
    {
      name: "iphone-grande",
      use: { ...devices["iPhone 15"] },
      testMatch: /(responsiva|buscador-global-responsiva)\.spec\.ts/,
    },
    {
      name: "tablet",
      use: { ...devices["iPad Mini"] },
      testMatch: /(responsiva|buscador-global-responsiva)\.spec\.ts/,
    },
  ],
  webServer: omitirServidor
    ? undefined
    : {
        command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
        url: "http://127.0.0.1:3100",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
