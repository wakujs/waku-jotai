import { expect, test } from 'vitest';
import { getStore, Provider } from 'waku-jotai/minimal';

test('exports', () => {
  expect(getStore).toBeDefined();
  expect(Provider).toBeDefined();
});
