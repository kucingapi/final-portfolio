import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against `next dev` on its own port, with analytics pointed at a key that never leaves
 * the browser (the tests intercept /relay), a mock of PostHog's query API, and a fixed dashboard secret.
 * Data lands in .data/ as in development; the tests delete the links they make. Don't run this while
 * your own `next dev` is running from this folder.
 */
const PORT = 3100;
export const MOCK_POSTHOG_PORT = 3199;

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "off" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
  webServer: [
    {
      command: `node e2e/mock-posthog.mjs ${MOCK_POSTHOG_PORT}`,
      port: MOCK_POSTHOG_PORT,
      reuseExistingServer: Boolean(process.env.REUSE),
    },
    {
      command: `node e2e/dev.mjs ${PORT}`,
      // A page, not just the port: the port can open a moment before a restart (see e2e/dev.mjs).
      url: `http://localhost:${PORT}/proposal`,
      timeout: 180_000,
      reuseExistingServer: Boolean(process.env.REUSE),
      env: {
        NEXT_PUBLIC_POSTHOG_KEY: "phc_e2e_test",
        NEXT_PUBLIC_POSTHOG_PROJECT_ID: "4242",
        POSTHOG_PERSONAL_API_KEY: "phx_e2e_test",
        POSTHOG_API_HOST: `http://127.0.0.1:${MOCK_POSTHOG_PORT}`,
        DASHBOARD_TOTP_SECRET: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
        NEXT_PUBLIC_SITE_URL: "",
        KV_REST_API_URL: "",
        KV_REST_API_TOKEN: "",
        CV_MCP_TOKEN: "",
        RESEND_API_KEY: "",
      },
    },
  ],
});
