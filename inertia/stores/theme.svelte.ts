import { writable } from 'svelte/store'

// Check if we're in browser (not SSR)
const browser = typeof window !== 'undefined'

export type Theme = 'light' | 'dark' | 'system'

type ResolvedTheme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'theme'
const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)'

function readStoredTheme(): Theme {
  if (!browser) return 'light'

  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY)
  if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system') {
    return storedTheme
  }

  return 'light'
}

function resolveTheme(theme: Theme): ResolvedTheme {
  if (!browser) return 'light'

  if (theme === 'system') {
    return window.matchMedia(SYSTEM_THEME_QUERY).matches ? 'dark' : 'light'
  }

  return theme
}

function syncThemeColorMeta(resolvedTheme: ResolvedTheme) {
  if (!browser) return

  const metaThemeColor = document.querySelector("meta[name='theme-color']")
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', resolvedTheme === 'dark' ? '#171211' : '#ffffff')
  }
}

// Tạo writable store cho theme
function createThemeStore() {
  const initialTheme = readStoredTheme()
  const { subscribe, set, update } = writable<Theme>(initialTheme)

  // Khởi tạo theme từ localStorage
  if (browser) {
    applyTheme(initialTheme)
    registerSystemThemeListener()
  }

  return {
    subscribe,
    set: (value: Theme) => {
      set(value)
      if (browser) {
        localStorage.setItem(THEME_STORAGE_KEY, value)
        applyTheme(value)
      }
    },
    toggle: () => {
      update((current) => {
        const newTheme = current === 'light' ? 'dark' : 'light'
        if (browser) {
          localStorage.setItem(THEME_STORAGE_KEY, newTheme)
          applyTheme(newTheme)
        }
        return newTheme
      })
    },
  }
}

function applyTheme(theme: Theme) {
  if (!browser) return

  const resolvedTheme = resolveTheme(theme)

  document.documentElement.classList.toggle('dark', resolvedTheme === 'dark')
  document.documentElement.dataset.theme = resolvedTheme
  document.documentElement.style.colorScheme = resolvedTheme
  syncThemeColorMeta(resolvedTheme)
}

let systemThemeListenerRegistered = false

function registerSystemThemeListener() {
  if (!browser || systemThemeListenerRegistered) return

  const mediaQuery = window.matchMedia(SYSTEM_THEME_QUERY)
  const handleSystemThemeChange = () => {
    if (readStoredTheme() === 'system') {
      applyTheme('system')
    }
  }

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handleSystemThemeChange)
  } else {
    mediaQuery.onchange = handleSystemThemeChange
  }

  systemThemeListenerRegistered = true
}

export function initTheme() {
  if (!browser) return

  const initialTheme = readStoredTheme()
  applyTheme(initialTheme)
  registerSystemThemeListener()
}

export const theme = createThemeStore()

// Hook-like function để sử dụng trong components
export function useTheme() {
  return {
    theme,
    setTheme: theme.set,
    toggleTheme: theme.toggle,
  }
}
