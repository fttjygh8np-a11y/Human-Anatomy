/**
 * Playwright e2e + accessibility tests (e2e/*.spec.ts) against the production build served by
 * `vite preview`.
 *
 * Environment:
 *   CHROMIUM_PATH        Chromium executable. Default: /opt/pw-browsers/chromium when it exists
 *                        (development container), otherwise Playwright's own browser
 *                        (`npx playwright install chromium`, as in CI).
 *   E2E_PORT             preview port (default 4183, separate from the usual 4173).
 *   E2E_SKIP_BUILD=1     serve the existing dist/ instead of running `npm run build` first.
 *   E2E_REUSE_SERVER=1   use a server already listening on E2E_PORT.
 */
import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

const LOCAL_CHROMIUM = '/opt/pw-browsers/chromium'
export const chromiumPath = process.env.CHROMIUM_PATH || (existsSync(LOCAL_CHROMIUM) ? LOCAL_CHROMIUM : undefined)
/** WebGL through SwiftShader (software rendering) so the 3D viewer also runs headless. */
export const GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']

const port = Number(process.env.E2E_PORT || 4183)
const preview = `npx vite preview --port ${port} --strictPort`

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Software WebGL is CPU heavy; keep parallelism moderate.
  workers: process.env.CI ? 2 : 3,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${port}/`,
    locale: 'tr-TR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1400, height: 900 },
        launchOptions: { ...(chromiumPath ? { executablePath: chromiumPath } : {}), args: GL_ARGS },
      },
    },
  ],
  webServer: {
    command: process.env.E2E_SKIP_BUILD ? preview : `npm run build && ${preview}`,
    url: `http://localhost:${port}/`,
    reuseExistingServer: !!process.env.E2E_REUSE_SERVER,
    timeout: 240_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
