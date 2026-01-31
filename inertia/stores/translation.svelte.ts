import { writable, get } from 'svelte/store'

// Check if running in browser
const browser = typeof window !== 'undefined'

// Danh sách các module ngôn ngữ
const LANGUAGE_MODULES = [
  'common',
  'auth',
  'organization',
  'user',
  'task',
  'conversation',
  'settings',
]

// Cache để lưu trữ các dịch đã tải
type TranslationsCache = {
  [locale: string]: {
    [module: string]: Record<string, unknown>
  }
}

const translationsCache: TranslationsCache = {}

interface TranslationState {
  locale: string
  loadedModules: string[]
  translations: Record<string, unknown>
}

function createTranslationStore() {
  const { subscribe, set, update } = writable<TranslationState>({
    locale: 'en',
    loadedModules: [],
    translations: {},
  })

  // Hàm để tải một module ngôn ngữ
  const loadTranslationModule = async (locale: string, module: string): Promise<void> => {
    if (!browser) return

    // Kiểm tra cache trước
    if (translationsCache[locale]?.[module]) {
      return
    }

    try {
      const response = await fetch(`/lang/${locale}/${module}.json`)
      if (!response.ok) {
        console.error(`Error loading translation module ${module} for locale ${locale}`)
        return
      }

      const moduleTranslations = await response.json()

      if (!translationsCache[locale]) {
        translationsCache[locale] = {}
      }

      translationsCache[locale][module] = moduleTranslations
    } catch (error) {
      console.error(`Error loading translation module ${module}:`, error)
    }
  }

  return {
    subscribe,

    // Khởi tạo với locale
    init: async (locale: string, translations: Record<string, unknown> = {}) => {
      set({ locale, loadedModules: [], translations })

      // Tải tất cả các module
      await Promise.all(LANGUAGE_MODULES.map((module) => loadTranslationModule(locale, module)))

      update((state) => ({
        ...state,
        loadedModules: LANGUAGE_MODULES,
      }))
    },

    // Thay đổi locale
    setLocale: async (locale: string) => {
      update((state) => ({ ...state, locale, loadedModules: [] }))

      await Promise.all(LANGUAGE_MODULES.map((module) => loadTranslationModule(locale, module)))

      update((state) => ({
        ...state,
        loadedModules: LANGUAGE_MODULES,
      }))
    },

    // Hàm dịch
    t: (key: string, params: Record<string, unknown> = {}, fallback?: string): string => {
      const state = get({ subscribe })
      let result: string | Record<string, unknown> | undefined

      // Tìm trong translations từ page props
      const keys = key.split('.')
      result = state.translations

      for (const k of keys) {
        if (result && typeof result === 'object' && k in result) {
          result = result[k] as string | Record<string, unknown>
        } else {
          result = undefined
          break
        }
      }

      // Nếu không tìm thấy, tìm trong cache
      if (!result) {
        const [module, ...restKeys] = keys

        if (translationsCache[state.locale]?.[module]) {
          result = translationsCache[state.locale][module]

          for (const k of restKeys) {
            if (result && typeof result === 'object' && k in result) {
              result = result[k] as string | Record<string, unknown>
            } else {
              result = undefined
              break
            }
          }
        }
      }

      // Nếu vẫn không tìm thấy, trả về fallback hoặc key
      if (!result || typeof result !== 'string') {
        return fallback ?? key
      }

      // Thay thế các tham số
      let translatedText = result
      for (const [paramKey, paramValue] of Object.entries(params)) {
        const strValue =
          typeof paramValue === 'string' ||
          typeof paramValue === 'number' ||
          typeof paramValue === 'boolean'
            ? String(paramValue)
            : JSON.stringify(paramValue)
        translatedText = translatedText.replace(new RegExp(`:${paramKey}`, 'g'), strValue)
      }

      return translatedText
    },
  }
}

export const translationStore = createTranslationStore()

// Hook-like function
export function useTranslation() {
  return {
    ...translationStore,
    t: translationStore.t,
  }
}
