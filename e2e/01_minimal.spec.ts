import { expect, test, type Page } from '@playwright/test';

test.use({ baseURL: `http://localhost:${process.env.E2E_PORT_01_MINIMAL}` });

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
  await expect(page.locator('h1')).toHaveText('Hello Waku!!');
  await expect(page.getByText('Count: 1', { exact: true })).toBeVisible();
  // doubleCountAtom is a server-only atom deriving from the client countAtom.
  await expect(
    page.getByText('(doubleCount=2)', { exact: true }),
  ).toBeVisible();
});

test('client atom mutation recomputes the server-only atom', async ({
  page,
}) => {
  await page.goto('/');
  await waitForHydration(page);
  await expect(
    page.getByText('(doubleCount=2)', { exact: true }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Increment' }).click();

  // The shared atom crosses to the server, which re-derives doubleCount = 4
  // and streams the updated tree back.
  await expect(page.getByText('(doubleCount=4)', { exact: true })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText('Count: 2', { exact: true })).toBeVisible();
});
