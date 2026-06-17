import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: true,
  retries: 1,
  workers: 2,
  reporter: [
    ["list"],
    ["html", { outputFolder: "./headless-results/html-report", open: "never" }],
    ["json", { outputFile: "./headless-results/results.json" }],
  ],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    headless: true,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "node mock-server/server.js",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 10000,
  },
  outputDir: "./headless-results/test-artifacts",
});
