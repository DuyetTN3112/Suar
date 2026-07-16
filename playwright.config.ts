import { defineConfig, devices } from '@playwright/test'

const baseUrl = `http://127.0.0.1:${process.env['PORT'] || '3333'}`
const testHealthUrl = `${baseUrl}/api/testing/health`
const runFullMatrix = process.env['E2E_FULL_MATRIX'] === 'true'
const requestedWorkers = Number.parseInt(process.env['E2E_WORKERS'] ?? '', 10)
const reuseExistingServer = process.env['E2E_REUSE_EXISTING_SERVER'] === 'true'

const chromiumProject = {
  name: 'chromium',
  use: { ...devices['Desktop Chrome'] },
}

const optionalProjects = [
  {
    name: 'firefox',
    use: { ...devices['Desktop Firefox'] },
  },
  {
    name: 'webkit',
    use: { ...devices['Desktop Safari'] },
  },
  {
    name: 'mobile-chrome',
    use: { ...devices['Pixel 5'] },
  },
  {
    name: 'mobile-safari',
    use: { ...devices['iPhone 14'] },
  },
]

export default defineConfig({
  testDir: '.',
  testMatch: [
    'inertia/apps/*/tests/e2e/**/*.spec.ts',
  ],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  // Specs share testing users and current-org state, so default local runs match CI isolation.
  workers:
    process.env['CI']
      ? 1
      : Number.isFinite(requestedWorkers) && requestedWorkers > 0
        ? requestedWorkers
        : 1,
  reporter: 'html',
  use: {
    baseURL: baseUrl,
    trace: 'on-first-retry',
  },
  projects: runFullMatrix ? [chromiumProject, ...optionalProjects] : [chromiumProject],
  webServer: {
    command: 'sh scripts/start_e2e_server.sh',
    url: testHealthUrl,
    reuseExistingServer,
  },
})
