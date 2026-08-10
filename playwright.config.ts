import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:43917",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
    permissions: ["clipboard-read", "clipboard-write"],
  },
  webServer: {
    command: "npx serve out --listen 43917 --no-clipboard",
    url: "http://127.0.0.1:43917",
    reuseExistingServer: !process.env.CI,
  },
});
