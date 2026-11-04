import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/web',
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
    {
      command:
        'website/node_modules/.bin/wrangler dev --config website/dist/server/wrangler.json --port 5192 --ip 127.0.0.1 --var CMS_SETUP_TOKEN:fictional-test-token',
      url: 'http://127.0.0.1:5192',
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
});
