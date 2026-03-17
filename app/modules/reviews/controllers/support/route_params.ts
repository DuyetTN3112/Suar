export function requireRouteParam(params: unknown, name: string): string {
  const value = (params as Record<string, unknown>)[name]
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing route param: ${name}`)
  }
  return value
}

export function safeTaskDetailRedirect(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback
  }

  const redirectTo = value.trim()
  if (redirectTo.startsWith('/tasks/') || redirectTo.startsWith('/org/tasks/')) {
    return redirectTo
  }

  return fallback
}
