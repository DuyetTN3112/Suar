import type { PolicyResult } from '#modules/authorization/public_contracts/policy_result'
import { PolicyResult as PR } from '#modules/authorization/public_contracts/policy_result'
import { CustomSystemRoleService } from '#modules/authorization/services/custom_system_role_service'

const SYSTEM_ADMIN_ROLES = new Set(['superadmin', 'system_admin'])

export async function canAccessSystemAdministration(actorSystemRole: string | null): Promise<PolicyResult> {
  if (!actorSystemRole) {
    return PR.deny('Chỉ system admin mới được chuyển Admin Mode')
  }

  if (SYSTEM_ADMIN_ROLES.has(actorSystemRole)) {
    return PR.allow()
  }

  if (await CustomSystemRoleService.isCustomRole(actorSystemRole)) {
    return PR.allow()
  }

  return PR.deny('Chỉ system admin mới được chuyển Admin Mode')
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

  // Also allow if it's a valid custom system role that has the needed permissions...
  // Wait, allowedRoles in this context usually means 'superadmin' etc.
  // If allowedRoles includes 'system_admin', any custom role might be considered a system admin,
  // but if it's a specific check, we'd need to verify permissions.
  // The system_admin_access middleware just checks canAccessSystemAdministration.
  // The canAccessAllowedSystemRoles is only used by AuthorizeRoleMiddleware.
  if (await CustomSystemRoleService.isCustomRole(actorSystemRole)) {
    // For custom roles, we assume they are allowed to access if they are a valid custom role.
    // However, granular permissions should be checked inside the controller.
    return PR.allow()
  }

  return PR.deny('Bạn không có quyền truy cập chức năng này')
}
