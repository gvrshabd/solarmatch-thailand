import { defineConfig, devices } from '@playwright/test';

/** Run against an already rebuilt local preview; this config never deploys or starts providers. */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /calculator-v3(?:-[a-z0-9-]+)?\.spec\.ts/,
  outputDir: './test-results/calculator-v3',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: 'line',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'calculator-desktop-chromium', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    { name: 'calculator-android-chromium', use: { ...devices['Pixel 7'], channel: 'chrome' } },
    { name: 'calculator-mobile-webkit', use: { ...devices['iPhone 13'], browserName: 'webkit' } },
  ],
});
