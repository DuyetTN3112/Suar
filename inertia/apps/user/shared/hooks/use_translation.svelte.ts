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

export function useTranslation() {
  const translationProps = $derived(page.props as TranslationProps)
  const currentLocale = $derived(translationProps.locale ?? 'en')
  const currentTranslations = $derived(translationProps.translations ?? {})

  function t(key: string, params: Record<string, unknown> = {}, fallback?: string): string {
    const keys = key.split('.')
    const [moduleName, ...restKeys] = keys
    const value = moduleName ? getModuleValue(currentTranslations, moduleName, restKeys) : undefined

    const text = typeof value === 'string' ? value : (fallback ?? key)

    // Replace placeholders like :name in both translations and fallbacks.
    return text.replace(
      /:(\w+)|\{(\w+)\}/g,
      (match: string, colonKey?: string, braceKey?: string) => {
        const placeholderKey = colonKey ?? braceKey
        if (!placeholderKey) return match
        const paramValue = params[placeholderKey]

        if (typeof paramValue === 'string') {
          return paramValue
        }

        if (typeof paramValue === 'number' || typeof paramValue === 'boolean') {
          return String(paramValue)
        }

        if (paramValue === undefined || paramValue === null) {
          return match
        }

        return JSON.stringify(paramValue)
      }
    )
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
