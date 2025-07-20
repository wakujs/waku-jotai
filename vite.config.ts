/// <reference types="vitest" />
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      'waku-jotai': resolve('src'),
    },
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/vitest-setup.ts'],
  },
});
