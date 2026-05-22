import { writable, get } from 'svelte/store'

// Check if running in browser
const browser = typeof window !== 'undefined'

// Language modules loaded by every shell.
const LANGUAGE_MODULES = [
  'common',
  'auth',
  'organization',
  'user',
  'task',
  'conversation',
  'notifications',
  'settings',
]

type TranslationTree = Record<string, unknown>

// Loaded translation module cache.
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

function getModuleValue(source: unknown, module: string, restKeys: string[]): unknown {
  const directValue = getNestedValue(source, [module, ...restKeys])
  if (directValue !== undefined) return directValue

  const moduleTree = getNestedValue(source, [module])
  if (!isRecord(moduleTree)) return undefined

  const unwrappedValue = restKeys.length > 0 ? getNestedValue(moduleTree, restKeys) : moduleTree
  if (unwrappedValue !== undefined) return unwrappedValue

  const wrappedTree = getNestedValue(moduleTree, [module])
  if (!isRecord(wrappedTree)) return undefined

  return restKeys.length > 0 ? getNestedValue(wrappedTree, restKeys) : wrappedTree
}

function createTranslationStore() {
  const { subscribe, set, update } = writable<TranslationState>({
    locale: 'en',
    loadedModules: [],
    translations: {},
  })

  // Load one translation module.
  const loadTranslationModule = async (locale: string, module: string): Promise<void> => {
    if (!browser) return

    // Check cache first.
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

    // Initialize locale.
    init: async (locale: string, translations: Record<string, unknown> = {}) => {
      set({ locale, loadedModules: [], translations })

      // Load all modules.
      await Promise.all(LANGUAGE_MODULES.map((module) => loadTranslationModule(locale, module)))

      update((state) => ({
        ...state,
        loadedModules: LANGUAGE_MODULES,
      }))
    },

    // Change locale.
    setLocale: async (locale: string) => {
      update((state) => ({ ...state, locale, loadedModules: [] }))

      await Promise.all(LANGUAGE_MODULES.map((module) => loadTranslationModule(locale, module)))

      update((state) => ({
        ...state,
        loadedModules: LANGUAGE_MODULES,
      }))
    },

    // Translate a key.
    t: (key: string, params: Record<string, unknown> = {}, fallback?: string): string => {
      const state = get({ subscribe })
      const keys = key.split('.')
      const [moduleName, ...restKeys] = keys
      let result: unknown = moduleName ? getModuleValue(state.translations, moduleName, restKeys) : undefined

      // Fall back to browser-loaded cache.
      if (result === undefined && moduleName) {
        const cachedModule = translationsCache[state.locale]?.[moduleName]

        if (cachedModule) {
          result = getModuleValue({ [moduleName]: cachedModule }, moduleName, restKeys)
        }
      }

      // If no string is found, return fallback or key.
      if (typeof result !== 'string') {
        return fallback ?? key
      }

      // Replace params.
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
