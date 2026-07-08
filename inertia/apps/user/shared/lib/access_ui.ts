const BUILT_IN_ROLE_LABELS: Record<string, string> = {
  superadmin: 'System superadmin',
  system_admin: 'System admin',
  registered_user: 'Registered user',
  org_owner: 'Organization owner',
  org_admin: 'Organization admin',
  org_member: 'Organization member',
  project_owner: 'Project owner',
  project_manager: 'Project manager',
  project_member: 'Project member',
  project_viewer: 'Project viewer',
}

const BUILT_IN_ROLE_LABEL_KEYS = Object.fromEntries(
  Object.keys(BUILT_IN_ROLE_LABELS).map((role) => [role, `common.roles.${role}`])
) as Record<string, string>

type Translate = (key: string, params?: Record<string, unknown>, fallback?: string) => string

export function normalizeRoleCode(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function humanizeIdentifier(value: string): string {
  return value
    .replace(/^can_/, '')
    .split(/[_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

export function formatRoleLabel(value?: string | null, t?: Translate): string {
  if (!value) {
    return t?.('common.roles.unknown', {}, 'Unknown') ?? 'Unknown'
  }

  const fallback = BUILT_IN_ROLE_LABELS[value] ?? humanizeIdentifier(value)
  const labelKey = BUILT_IN_ROLE_LABEL_KEYS[value]

  return labelKey ? (t?.(labelKey, {}, fallback) ?? fallback) : fallback
}

export function groupByCategory<T extends { category: string }>(
  items: T[]
): { category: string; items: T[] }[] {
  const groups = new Map<string, T[]>()

  for (const item of items) {
    const groupItems = groups.get(item.category) ?? []
    groupItems.push(item)
    groups.set(item.category, groupItems)
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([category, entries]) => ({
      category,
      items: [...entries],
    }))
}
