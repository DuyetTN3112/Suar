import { AuthOrgRole, AuthSystemRole } from '#modules/authorization/constants/role_contracts'
import type { PolicyResult } from '#modules/policies/domain/policy_result'
import { PolicyResult as PR } from '#modules/policies/domain/policy_result'

export interface SystemUserAccessContext {
  actorSystemRole: string | null
  actorOrgRole: string | null
}

export function canAccessSystemUserAdministration(
  context: SystemUserAccessContext
): PolicyResult {
  if (
    context.actorSystemRole === AuthSystemRole.SUPERADMIN ||
    context.actorSystemRole === AuthSystemRole.SYSTEM_ADMIN
  ) {
    return PR.allow()
  }

  if (context.actorOrgRole === AuthOrgRole.OWNER) {
    return PR.allow()
  }

  return PR.deny('Bạn không có quyền truy cập khu vực quản trị người dùng')
}
