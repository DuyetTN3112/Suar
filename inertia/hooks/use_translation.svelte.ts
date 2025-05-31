import { page } from '@inertiajs/svelte'
import { derived } from 'svelte/store'
import { translationStore } from '@/stores/translation.svelte'

interface TranslationProps {
  locale?: string
  translations?: Record<string, unknown>
}

export function useTranslation() {
  // Get current page props
  const pageStore = derived(page, ($page) => $page.props as TranslationProps)

  let currentLocale = $state('')
  let currentTranslations = $state<Record<string, unknown>>({})

  // Subscribe to page changes
  pageStore.subscribe(({ locale, translations }) => {
    currentLocale = locale || 'vi'
    currentTranslations = translations || {}
  })

  function t(key: string, params: Record<string, unknown> = {}, fallback?: string): string {
    const keys = key.split('.')
    let value: any = currentTranslations

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        return fallback || key
      }
    }

    if (typeof value === 'string') {
      // Replace placeholders like :name with params
      return value.replace(/:(\w+)/g, (_, key) => {
        return params[key]?.toString() || `:${key}`
      })
    }

    return fallback || key
  }

  return {
    t,
    get locale() {
      return currentLocale
    },
    get translations() {
      return currentTranslations
    },
  }
}

// Re-export for compatibility
export default useTranslation
