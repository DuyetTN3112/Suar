export type UserAuditQueryValue = string | null | undefined

export interface BuildUserAuditHrefOptions {
  readonly resetCursor?: boolean
}

const USER_AUDIT_QUERY_KEYS = new Set([
  'after',
  'before',
  'event',
  'from',
  'outcome',
  'resourceType',
  'search',
  'to',
])

export function buildUserAuditHref(
  currentUrl: string,
  patch: Readonly<Record<string, UserAuditQueryValue>>,
  options: BuildUserAuditHrefOptions = {}
): string {
  const [path = '/', query = ''] = currentUrl.split('?')
  const params = new URLSearchParams(query)

  for (const key of [...params.keys()]) {
    if (!USER_AUDIT_QUERY_KEYS.has(key)) {
      params.delete(key)
    }
  }

  if (options.resetCursor) {
    params.delete('after')
    params.delete('before')
  }

  for (const [key, value] of Object.entries(patch)) {
    if (!USER_AUDIT_QUERY_KEYS.has(key)) continue

    if (value === null || value === undefined || value === '') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
  }

  const nextQuery = params.toString()
  return nextQuery ? `${path}?${nextQuery}` : path
}

export function countActiveUserAuditFilters(
  filters: Readonly<Record<string, UserAuditQueryValue>>
): number {
  return Object.values(filters).filter(
    (value) => value !== null && value !== undefined && value !== ''
  ).length
}

export function userAuditEventIdFromUrl(url: string): string | null {
  return new URLSearchParams(url.split('?')[1] ?? '').get('event')
}
