import { createServer } from 'node:net';
import { defineConfig, devices } from '@playwright/test';

const FIXTURES = ['01_minimal', '02_router', '03_search'] as const;

// Bind to port 0 and let the OS pick a free port. Tiny race between close and
// waku binding the same port, but reliable in practice.
const getAvailablePort = (): Promise<number> =>
  new Promise((resolve) => {
    const server = createServer();
    server.unref();
    server.listen(0, () => {
      const port = (server.address() as { port: number }).port;
      server.close(() => resolve(port));
    });
  });

// Playwright re-evaluates this config in each worker process, so we cache
// the parent's allocation in env vars and reuse it -- otherwise every worker
// would pick a fresh port and miss the webServer.
const ports = Object.fromEntries(
  await Promise.all(
    FIXTURES.map(async (f) => {
      const envKey = `E2E_PORT_${f.toUpperCase()}`;
      const existing = process.env[envKey];
      const port = existing ? Number(existing) : await getAvailablePort();
      process.env[envKey] = String(port);
      return [f, port];
    }),
  ),
) as Record<(typeof FIXTURES)[number], number>;

export default defineConfig({
  testDir: './e2e',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: FIXTURES.map((fixture) => ({
    command: `cd examples/${fixture} && waku dev -p ${ports[fixture]}`,
    url: `http://localhost:${ports[fixture]}`,
    reuseExistingServer: !process.env.CI,
  })),
});
