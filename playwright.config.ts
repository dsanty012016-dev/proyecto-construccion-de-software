import { defineConfig } from "@playwright/test";

const baseURL = "http://127.0.0.1:4378";

export default defineConfig({
  testDir: "./pruebas/e2e",
  workers: 1,
  timeout: 30_000,
  use: {
    baseURL,
    viewport: { width: 393, height: 852 },
    reducedMotion: "reduce",
    launchOptions: { executablePath: process.env.UNIGO_CHROME_PRUEBAS || undefined },
  },
  webServer: {
    command: "npm run start -- -H 127.0.0.1 -p 4378",
    url: baseURL,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:9",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_solo_pruebas",
    },
  },
});
