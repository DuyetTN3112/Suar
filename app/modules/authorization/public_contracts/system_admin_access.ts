import { customSystemRoleApi } from '#modules/authorization/public_contracts/custom_system_role_api'
import { SYSTEM_ROLE_PERMISSIONS } from '#modules/authorization/public_contracts/permissions'
import type { PolicyResult } from '#modules/authorization/public_contracts/policy_result'
import { PolicyResult as PR } from '#modules/authorization/public_contracts/policy_result'

const SYSTEM_ADMIN_ROLES = new Set(['superadmin', 'system_admin'])

async function getCustomRolePermissions(role: string): Promise<string[] | null> {
  return customSystemRoleApi.getRolePermissions(role)
}

function hasAnySystemPermission(permissions: readonly string[] | null): boolean {
  return !!permissions && permissions.length > 0
}

function overlapsAllowedRolePermissions(
  customPermissions: readonly string[],
  allowedRoles: string[]
): boolean {
  if (customPermissions.includes('*')) {
    return true
  }

  const allowedPermissions = new Set<string>()
  for (const role of allowedRoles) {
    for (const permission of SYSTEM_ROLE_PERMISSIONS[role] ?? []) {
      allowedPermissions.add(permission)
    }
  }

  return customPermissions.some((permission) => allowedPermissions.has(permission))
}

export async function canAccessSystemAdministration(actorSystemRole: string | null): Promise<PolicyResult> {
  if (!actorSystemRole) {
    return PR.deny('Chỉ System Admin mới có thể truy cập System Domain')
  }

  if (SYSTEM_ADMIN_ROLES.has(actorSystemRole)) {
    return PR.allow()
  }

  if (hasAnySystemPermission(await getCustomRolePermissions(actorSystemRole))) {
    return PR.allow()
  }

  return PR.deny('Chỉ System Admin mới có thể truy cập System Domain')
}

export async function canAccessAllowedSystemRoles(
  actorSystemRole: string | null,
  allowedRoles: string[]
): Promise<PolicyResult> {
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

  const customPermissions = await getCustomRolePermissions(actorSystemRole)
  if (customPermissions && overlapsAllowedRolePermissions(customPermissions, normalizedAllowedRoles)) {
    return PR.allow()
  }

  return PR.deny('Bạn không có quyền truy cập chức năng này')
}
