import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

/**
 * E2E runs its own `next dev` against the `test` Neon branch (database and
 * auth) with the mock model, so it never touches dev data or spends tokens.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL,
    storageState: "e2e/.auth/user.json",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `${baseURL}/sign-in`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL!,
      DATABASE_URL_UNPOOLED: process.env.TEST_DATABASE_URL_UNPOOLED!,
      NEON_AUTH_BASE_URL: process.env.TEST_NEON_AUTH_BASE_URL!,
      AI_MOCK: "1",
      // A separate build dir so this can run alongside your own `next dev`.
      NEXT_DIST_DIR: ".next-e2e",
    },
  },
});
