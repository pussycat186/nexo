import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  timeout: 60_000,
  testDir: "tests/e2e",
  use: { baseURL: "http://localhost:5000", trace: "on-first-retry" },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:5000",
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
  },
  projects: [{ name: "chromium", use: devices["Desktop Chrome"] }],
});