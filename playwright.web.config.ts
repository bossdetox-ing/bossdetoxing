import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/web',
  testMatch: 'app.spec.ts',
  outputDir: 'test-results-web',
  workers: 1,
  timeout: 60000,
  reporter: [['list']],
  use: {
    headless: true,
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE },
    trace: 'retain-on-failure',
  },
  webServer: [
    { command: 'npm run preview:web', url: 'http://127.0.0.1:5191', reuseExistingServer: false },
  ],
});
