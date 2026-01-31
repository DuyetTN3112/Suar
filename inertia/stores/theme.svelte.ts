import { writable } from 'svelte/store'

// Check if we're in browser (not SSR)
const browser = typeof window !== 'undefined'

export type Theme = 'light' | 'dark' | 'system'

// Tạo writable store cho theme
function createThemeStore() {
  const { subscribe, set, update } = writable<Theme>('light')

  // Khởi tạo theme từ localStorage
  if (browser) {
    const storedTheme = localStorage.getItem('theme') as Theme | null
    if (storedTheme) {
      set(storedTheme)
    }
  }

  return {
    subscribe,
    set: (value: Theme) => {
      set(value)
      if (browser) {
        localStorage.setItem('theme', value)
        applyTheme(value)
      }
    },
    toggle: () => {
      update((current) => {
        const newTheme = current === 'light' ? 'dark' : 'light'
        if (browser) {
          localStorage.setItem('theme', newTheme)
          applyTheme(newTheme)
        }
        return newTheme
      })
    },
  }
}

function applyTheme(theme: Theme) {
  if (!browser) return

  if (
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  ) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
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
