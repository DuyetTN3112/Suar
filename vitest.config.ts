import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { svelteTesting } from '@testing-library/svelte/vite'
import path from 'node:path'

const dirname = import.meta.dirname

export default defineConfig({
  plugins: [svelte(), svelteTesting()],
  resolve: {
    conditions: ['browser'],
    extensions: ['.svelte', '.ts', '.js', '.json'],
    alias: {
      '@': path.resolve(dirname, './inertia'),
      '@lib': path.resolve(dirname, './inertia/lib'),
      '$lib': path.resolve(dirname, './inertia/lib'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/frontend/setup.ts'],
    include: ['tests/component/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['inertia/components/**/*.svelte', 'inertia/pages/**/*.svelte'],
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
