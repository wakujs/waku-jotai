/// <reference types="vitest" />
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/vitest-setup.ts'],
  },
  plugins: [tsconfigPaths()],
});
