const BUILT_IN_ROLE_LABELS: Record<string, string> = {
  superadmin: 'Superadmin hệ thống',
  system_admin: 'Quản trị hệ thống',
  registered_user: 'Người dùng thành viên',
  org_owner: 'Chủ sở hữu tổ chức',
  org_admin: 'Quản trị viên tổ chức',
  org_member: 'Thành viên tổ chức',
  project_owner: 'Chủ sở hữu dự án',
  project_manager: 'Quản lý dự án',
  project_member: 'Thành viên dự án',
  project_viewer: 'Người xem dự án',
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
