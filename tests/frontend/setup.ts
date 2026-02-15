import '@testing-library/jest-dom/vitest'

import { vi } from 'vitest'

vi.mock('@/apps/admin/shared/stores/translation.svelte', async () => {
  return import('./translation_mock.js')
})

vi.mock('@/apps/org/shared/stores/translation.svelte', async () => {
  return import('./translation_mock.js')
})

vi.mock('@/apps/user/shared/stores/translation.svelte', async () => {
  return import('./translation_mock.js')
})

vi.mock('@/apps/admin/shared/hooks/use_translation.svelte', async () => {
  return import('./translation_mock.js')
})

vi.mock('@/apps/org/shared/hooks/use_translation.svelte', async () => {
  return import('./translation_mock.js')
})

vi.mock('@/apps/user/shared/hooks/use_translation.svelte', async () => {
  return import('./translation_mock.js')
})

class TestResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const testGlobal = globalThis as typeof globalThis & {
  ResizeObserver?: typeof ResizeObserver
  matchMedia?: typeof matchMedia
}

testGlobal.ResizeObserver ??= TestResizeObserver as typeof ResizeObserver

testGlobal.matchMedia ??= (() => ({
  matches: false,
  media: '',
  onchange: null,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  dispatchEvent: () => false,
})) as typeof matchMedia
