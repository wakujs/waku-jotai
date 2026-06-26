import { expect, test, type Page } from '@playwright/test';

test.use({ baseURL: `http://localhost:${process.env.E2E_PORT_02_ROUTER}` });

async function waitForHydration(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(
    () =>
      Object.getOwnPropertyNames(document.body).some((k) =>
        k.startsWith('__reactFiber'),
      ),
    null,
    { timeout: 60_000 },
  );
}

test('SSR renders the server-only derived atom', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.getByText('Count: 0', { exact: true })).toBeVisible();
  await expect(page.getByText('Jotai Count: 1', { exact: true })).toBeVisible();
  await expect(
    page.getByText('(doubleCount=2)', { exact: true }),
  ).toBeVisible();
});

test('local useState stays on the client', async ({ page }) => {
  await page.goto('/');
  await waitForHydration(page);

  await page.getByRole('button', { name: 'Increment', exact: true }).click();

  // Local state updates, but it never crosses the boundary: doubleCount holds.
  await expect(page.getByText('Count: 1', { exact: true })).toBeVisible();
  await expect(
    page.getByText('(doubleCount=2)', { exact: true }),
  ).toBeVisible();
});

test('shared jotai atom recomputes the server-only atom', async ({ page }) => {
  await page.goto('/');
  await waitForHydration(page);
  await expect(
    page.getByText('(doubleCount=2)', { exact: true }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Jotai Increment' }).click();

  await expect(page.getByText('Jotai Count: 2', { exact: true })).toBeVisible();
  await expect(page.getByText('(doubleCount=4)', { exact: true })).toBeVisible({
    timeout: 20_000,
  });
});
