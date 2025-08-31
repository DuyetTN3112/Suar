import type { PolicyResult } from '#domain/policies/policy_result'
import { canAccessSystemUsersList } from '#domain/users/user_management_rules'

export interface SystemUserAccessContext {
  actorSystemRole: string | null
  actorOrgRole: string | null
}

export function canAccessSystemUserAdministration(
  context: SystemUserAccessContext
): PolicyResult {
  return canAccessSystemUsersList(context)
}
