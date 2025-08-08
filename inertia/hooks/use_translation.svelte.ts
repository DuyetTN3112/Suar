import { page } from '@inertiajs/svelte'

interface TranslationProps {
  locale?: string
  translations?: Record<string, unknown>
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

export function useTranslation() {
  const translationProps = $derived(page.props as TranslationProps)
  const currentLocale = $derived(translationProps.locale ?? 'vi')
  const currentTranslations = $derived(translationProps.translations ?? {})

  function t(key: string, params: Record<string, unknown> = {}, fallback?: string): string {
    const keys = key.split('.')
    const value = getNestedValue(currentTranslations, keys)

    if (typeof value === 'string') {
      // Replace placeholders like :name with params
      return value.replace(/:(\w+)/g, (_match: string, placeholderKey: string) => {
        const paramValue = params[placeholderKey]

        if (typeof paramValue === 'string') {
          return paramValue
        }

        if (typeof paramValue === 'number' || typeof paramValue === 'boolean') {
          return String(paramValue)
        }

        if (paramValue === undefined || paramValue === null) {
          return `:${placeholderKey}`
        }

        return JSON.stringify(paramValue)
      })
    }

    return fallback ?? key
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
