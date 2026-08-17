import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';
import { resolve } from 'node:path';

// Paths are relative to this config file's directory. Don't use absolute
// paths — the user's home may contain parentheses which fast-glob would
// misinterpret as glob alternation.
const testDir = defineBddConfig({
  features: 'features/**/*.feature',
  steps: ['lib/hooks.ts', 'steps/**/*.steps.ts'],
  outputDir: '.features-gen/qa',
});

const ROOT = resolve(process.cwd());

export default defineConfig({
  testDir,
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'npm --prefix server run dev',
      cwd: ROOT,
      port: 3001,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'npx vite --port 5173',
      cwd: ROOT,
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
