import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['app/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@foldify/shared': fileURLToPath(new URL('../shared/types.ts', import.meta.url)),
    },
  },
});
