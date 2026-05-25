import type { PolicyResult } from '#modules/authorization/public_contracts/policy_result'
import { PolicyResult as PR } from '#modules/authorization/public_contracts/policy_result'

const SYSTEM_ADMIN_ROLES = new Set(['superadmin', 'system_admin'])

export function canAccessSystemAdministration(actorSystemRole: string | null): PolicyResult {
  if (actorSystemRole && SYSTEM_ADMIN_ROLES.has(actorSystemRole)) {
    return PR.allow()
  }

  return PR.deny('Chỉ system admin mới được chuyển Admin Mode')
}

export function canAccessAllowedSystemRoles(
  actorSystemRole: string | null,
  allowedRoles: string[]
): PolicyResult {
  if (!actorSystemRole) {
    return PR.deny('Bạn không có quyền truy cập chức năng này')
  }

  const normalizedRole = actorSystemRole.toLowerCase()
  const normalizedAllowedRoles = allowedRoles.map((role) => role.toLowerCase())
  const normalizedSystemAdminRoles = [...SYSTEM_ADMIN_ROLES].map((role) => role.toLowerCase())

  if (
    normalizedSystemAdminRoles.includes(normalizedRole) ||
    normalizedAllowedRoles.includes(normalizedRole)
  ) {
    return PR.allow()
  }

  return PR.deny('Bạn không có quyền truy cập chức năng này')
}
