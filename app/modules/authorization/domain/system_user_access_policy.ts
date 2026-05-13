import type { PolicyResult } from '#modules/policies/domain/policy_result'
import { canAccessSystemUsersList } from '#modules/users/domain/user_management_rules'

export interface SystemUserAccessContext {
  actorSystemRole: string | null
  actorOrgRole: string | null
}

export function canAccessSystemUserAdministration(
  context: SystemUserAccessContext
): PolicyResult {
  return canAccessSystemUsersList(context)
}
