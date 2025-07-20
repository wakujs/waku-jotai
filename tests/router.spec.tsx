import { expect, test } from 'vitest';
import { getStore, RouterProvider } from 'waku-jotai/router';

test('exports', () => {
  expect(getStore).toBeDefined();
  expect(RouterProvider).toBeDefined();
});
