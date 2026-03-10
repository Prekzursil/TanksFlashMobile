import { defineConfig, devices } from "@playwright/test";

const VISUAL_PORT = process.env.E2E_PORT || "4273";
const VISUAL_BASE_URL = `http://127.0.0.1:${VISUAL_PORT}`;

export default defineConfig({
  testDir: "./e2e/visual",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: [["line"]],
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.E2E_BASE_URL || VISUAL_BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${VISUAL_PORT} --strictPort`,
    url: VISUAL_BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
