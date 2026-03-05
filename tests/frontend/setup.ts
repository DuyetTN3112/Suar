import '@testing-library/jest-dom/vitest'

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
