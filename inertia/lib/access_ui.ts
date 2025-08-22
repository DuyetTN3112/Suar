const BUILT_IN_ROLE_LABELS: Record<string, string> = {
  superadmin: 'Superadmin',
  system_admin: 'System Admin',
  registered_user: 'Registered User',
  org_owner: 'Owner Org',
  org_admin: 'Org Admin',
  org_member: 'Org Member',
  project_owner: 'Project Owner',
  project_manager: 'Project Manager',
  project_member: 'Project Member',
  project_viewer: 'Project Viewer',
}

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

export function formatRoleLabel(value?: string | null): string {
  if (!value) {
    return 'Unknown'
  }

  return BUILT_IN_ROLE_LABELS[value] ?? humanizeIdentifier(value)
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
