import { expect, test, vi } from 'vitest';
import { getStore, RouterProvider } from 'waku-jotai/router';

vi.mock('waku/router/server', () => ({
  unstable_getRscPath: () => '',
  unstable_getRscParams: () => ({}),
}));

test('exports', () => {
  expect(getStore).toBeDefined();
  expect(RouterProvider).toBeDefined();
});
