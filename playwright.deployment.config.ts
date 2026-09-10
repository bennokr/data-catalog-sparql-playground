import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'deployment.spec.ts',
  timeout: 90 * 1000,
  use: {
    baseURL: 'http://127.0.0.1:4174',
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: 'npx http-server ../_site -p 4174',
    port: 4174,
    timeout: 30 * 1000,
  },
});
