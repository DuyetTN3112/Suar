import type { PolicyResult } from '#modules/authorization/public_contracts/policy_result'
import { PolicyResult as PR } from '#modules/authorization/public_contracts/policy_result'
import { AuthSystemRole } from '#modules/authorization/public_contracts/role_contracts'

export interface SystemUserAccessContext {
  actorSystemRole: string | null
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

  return PR.deny('Tài khoản hiện tại không thuộc khu vực quản trị hệ thống')
}
