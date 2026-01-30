export function safeTaskDetailRedirect(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback
  }

  const redirectTo = value.trim()
  if (
    redirectTo.startsWith('/tasks/') ||
    redirectTo.startsWith('/org/tasks/') ||
    /^\/projects\/[^/]+\/reviews\/tasks(?:\?|$)/.test(redirectTo)
  ) {
    return redirectTo
  }

  return fallback
}
