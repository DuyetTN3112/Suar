import path from 'node:path'

import { svelte } from '@sveltejs/vite-plugin-svelte'
import { svelteTesting } from '@testing-library/svelte/vite'
import { defineConfig } from 'vitest/config'

const dirname = import.meta.dirname

export default defineConfig({
  plugins: [svelte(), svelteTesting()],
  resolve: {
    conditions: ['browser'],
    extensions: ['.svelte', '.ts', '.js', '.json'],
    alias: {
      '@': path.resolve(dirname, './inertia'),
      '@user': path.resolve(dirname, './inertia/apps/user'),
      '@org': path.resolve(dirname, './inertia/apps/org'),
      '@admin': path.resolve(dirname, './inertia/apps/admin'),
      '@lib': path.resolve(dirname, './inertia/apps/user/shared/lib'),
      '$lib': path.resolve(dirname, './inertia/apps/user/shared/lib'),
      '@shared': path.resolve(dirname, './inertia/apps/user/shared'),
      '@modules': path.resolve(dirname, './inertia/apps/user/modules'),
      '#tests': path.resolve(dirname, './tests'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/frontend/setup.ts'],
    include: [
      'inertia/apps/**/tests/**/*.test.ts',
    ],
    exclude: [
      'inertia/apps/**/tests/e2e/**',
      'inertia/apps/**/tests/ui/testWrappers/**',
      '**/*.test.svelte',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['inertia/apps/**/components/**/*.svelte', 'inertia/apps/**/pages/**/*.svelte'],
      exclude: ['**/*.stories.ts', '**/*.d.ts'],
      thresholds: {
        statements: 50,
        branches: 40,
        functions: 50,
        lines: 50,
      },
    },
  },
})
