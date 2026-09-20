export type TranslateFn = (
  key: string,
  params?: Record<string, unknown>,
  fallback?: string
) => string

export function defaultTranslate(
  key: string,
  params: Record<string, unknown> = {},
  fallback?: string
): string {
  const text = fallback ?? key
  return text.replace(
    /:(\w+)|\{(\w+)\}/g,
    (match: string, colonKey: string | undefined, braceKey: string | undefined) => {
      const paramKey = colonKey ?? braceKey
      if (!paramKey) return match
      const paramValue = params[paramKey]
      if (paramValue === undefined || paramValue === null) return match
      if (typeof paramValue === 'string') return paramValue
      if (typeof paramValue === 'number' || typeof paramValue === 'boolean') return String(paramValue)
      return JSON.stringify(paramValue)
    }
  )
}
