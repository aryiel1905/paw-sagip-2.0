import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    trace: "on-first-retry",
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },

  projects: [
    {
      name: "Mobile - iPhone 12",
      use: { ...devices["iPhone 12"] },
    },
    {
      name: "Mobile - Pixel 5",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile - iPhone SE",
      use: { ...devices["iPhone SE"] },
    },
    {
      name: "Desktop - 1280",
      use: { viewport: { width: 1280, height: 800 } },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },

  outputDir: "playwright-results",
});
