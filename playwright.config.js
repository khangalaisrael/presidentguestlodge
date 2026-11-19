// @ts-check
const { defineConfig, devices } = require('@playwright/test');

// Set CHROME_PATH to use an installed Chrome instead of Playwright's download.
const launchOptions = process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {};

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    launchOptions,
  },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'], browserName: 'chromium', launchOptions } },
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 }, browserName: 'chromium', launchOptions } },
  ],
  webServer: {
    command: 'node tests/serve.js 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
});
