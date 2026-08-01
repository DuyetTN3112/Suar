export type OrganizationAuditQueryValue = string | null | undefined

export interface BuildOrganizationAuditHrefOptions {
  readonly resetCursor?: boolean
}

export function buildOrganizationAuditHref(
  currentUrl: string,
  patch: Readonly<Record<string, OrganizationAuditQueryValue>>,
  options: BuildOrganizationAuditHrefOptions = {}
): string {
  const [path = '/', query = ''] = currentUrl.split('?')
  const params = new URLSearchParams(query)

  if (options.resetCursor) {
    params.delete('after')
    params.delete('before')
  }

  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined || value === '') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
  }

  const nextQuery = params.toString()
  return nextQuery ? `${path}?${nextQuery}` : path
}

export function countActiveOrganizationAuditFilters(
  filters: Readonly<Record<string, OrganizationAuditQueryValue>>
): number {
  return Object.values(filters).filter(
    (value) => value !== null && value !== undefined && value !== ''
  ).length
}

export function organizationAuditTargetHref(target: {
  readonly type: string
  readonly id: string | null
}): string | null {
  if (!target.id) return null
  const encodedId = encodeURIComponent(target.id)

  if (target.type === 'task') return `/org/tasks/${encodedId}`
  if (target.type === 'project') return `/org/projects/${encodedId}`
  if (target.type === 'organization') return '/org/settings'

  return null
}
