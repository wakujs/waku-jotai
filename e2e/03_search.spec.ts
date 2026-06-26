import { expect, test, type Page } from '@playwright/test';

test.use({ baseURL: `http://localhost:${process.env.E2E_PORT_03_SEARCH}` });

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

test('SSR renders the full server-filtered list', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(
    page.getByText('28 of 28 fruits', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('listitem')).toHaveCount(28);
});

test('client query atom drives the server-side filter', async ({ page }) => {
  await page.goto('/');
  await waitForHydration(page);
  await expect(page.getByRole('listitem')).toHaveCount(28);

  await page.getByRole('searchbox').fill('berry');

  // The query lives in a client atom; filtering happens on the server.
  await expect(page.getByText('5 of 28 fruits', { exact: true })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole('listitem')).toHaveCount(5);
  await expect(page.getByText('Apple', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Blackberry', { exact: true })).toBeVisible();
  // The input keeps its own client-only state.
  await expect(page.getByRole('searchbox')).toHaveValue('berry');

  await page.getByRole('searchbox').fill('');
  await expect(page.getByText('28 of 28 fruits', { exact: true })).toBeVisible({
    timeout: 20_000,
  });
});
