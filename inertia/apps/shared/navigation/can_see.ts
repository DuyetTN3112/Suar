export type OrganizationRole = 'org_owner' | 'org_admin' | 'org_member' | string | null
export type SystemRole = 'superadmin' | 'system_admin' | 'registered_user' | string | null

export interface OrganizationNavigationViewer {
  organizationRole: OrganizationRole
}

export interface SystemNavigationViewer {
  systemRole?: SystemRole
  systemPermissions?: readonly string[] | null
}

export function canSeeSystemAdminNavigation(viewer: SystemNavigationViewer): boolean {
  return viewer.systemRole === 'superadmin' || viewer.systemRole === 'system_admin'
}

export function canSeeRecruitingNavigation(viewer: OrganizationNavigationViewer): boolean {
  return viewer.organizationRole === 'org_owner' || viewer.organizationRole === 'org_admin'
}

export function canSeeOrganizationManagementNavigation(
  viewer: OrganizationNavigationViewer
): boolean {
  return viewer.organizationRole === 'org_owner' || viewer.organizationRole === 'org_admin'
}

const RETIRED_OR_BROKEN_ORG_URLS = new Set(['/org/departments', '/org/tasks/workflow'])

const MEMBER_SAFE_ORG_URLS = new Set([
  '/org',
  '/org/projects',
  '/org/sprints',
  '/org/marketplace/tasks',
  '/org/search',
  '/org/notifications',
])

const ADMIN_URL_RULES: Array<{
  matches: (url: string) => boolean
  permissions: readonly string[]
}> = [
  {
    matches: (url) => url === '/admin' || url.startsWith('/admin/dashboards'),
    permissions: ['can_view_reports', 'can_view_system_logs'],
  },
  {
    matches: (url) => url.startsWith('/admin/users'),
    permissions: ['can_manage_users', 'users.read'],
  },
  {
    matches: (url) => url.startsWith('/admin/organizations'),
    permissions: ['can_view_all_organizations'],
  },
  {
    matches: (url) => url.startsWith('/admin/audit-logs'),
    permissions: ['can_view_system_logs', 'can_view_audit_logs', 'audit.read'],
  },
  {
    matches: (url) => url.startsWith('/admin/permissions'),
    permissions: ['can_manage_system_settings', 'can_create_custom_roles'],
  },
  {
    matches: (url) => url.startsWith('/admin/reviews') || url.startsWith('/admin/disputes'),
    permissions: ['can_view_reports'],
  },
  {
    matches: (url) =>
      url.startsWith('/admin/proficiency') ||
      url.startsWith('/admin/packages') ||
      url.startsWith('/admin/qr-codes'),
    permissions: ['can_manage_system_settings'],
  },
]

function urlPath(url: string): string {
  return url.split('?')[0] ?? url
}

function hasAnyPermission(
  permissions: readonly string[] | null | undefined,
  requiredPermissions: readonly string[]
): boolean {
  if (!permissions || permissions.length === 0) return false
  if (permissions.includes('*')) return true

  return requiredPermissions.some((permission) => permissions.includes(permission))
}

export function canSeeOrganizationNavigationUrl(
  url: string,
  viewer: OrganizationNavigationViewer
): boolean {
  const path = urlPath(url)

  if (RETIRED_OR_BROKEN_ORG_URLS.has(path)) {
    return false
  }

  if (canSeeOrganizationManagementNavigation(viewer)) {
    return true
  }

  return MEMBER_SAFE_ORG_URLS.has(path)
}

export function canSeeAdminNavigationUrl(url: string, viewer: SystemNavigationViewer): boolean {
  if (canSeeSystemAdminNavigation(viewer)) {
    return true
  }

  const rule = ADMIN_URL_RULES.find((candidate) => candidate.matches(url))
  return rule ? hasAnyPermission(viewer.systemPermissions, rule.permissions) : false
}
