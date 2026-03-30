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

type TranslationTree = Record<string, unknown>

// Cache để lưu trữ các dịch đã tải
type TranslationsCache = Partial<Record<string, Partial<Record<string, TranslationTree>>>>

const translationsCache: TranslationsCache = {}

interface TranslationState {
  locale: string
  loadedModules: string[]
  translations: TranslationTree
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getNestedValue(source: unknown, keys: string[]): unknown {
  let current: unknown = source

  for (const key of keys) {
    if (!isRecord(current) || !(key in current)) {
      return undefined
    }

    current = current[key]
  }

  return current
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

      const moduleTranslations = (await response.json()) as unknown

      if (!isRecord(moduleTranslations)) {
        console.error(`Error loading translation module ${module} for locale ${locale}`)
        return
      }

      const localeCache = translationsCache[locale] ?? {}
      localeCache[module] = moduleTranslations
      translationsCache[locale] = localeCache
    } catch (error: unknown) {
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
      const keys = key.split('.')
      let result: unknown = getNestedValue(state.translations, keys)

      // Nếu không tìm thấy, tìm trong cache
      if (result === undefined) {
        const [module, ...restKeys] = keys
        const cachedModule = translationsCache[state.locale]?.[module]

        if (cachedModule) {
          result = restKeys.length > 0 ? getNestedValue(cachedModule, restKeys) : cachedModule
        }
      }

      // Nếu vẫn không tìm thấy, trả về fallback hoặc key
      if (typeof result !== 'string') {
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
