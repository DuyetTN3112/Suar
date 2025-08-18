import {
  canAccessSystemUserAdministration,
  type SystemUserAccessContext,
} from '#modules/authorization/domain/system_user_access_policy'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import type { PolicyResult } from '#modules/authorization/public_contracts/policy_result'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'
import { userPublicApi } from '#modules/users/public_contracts/user_public_api'

/**
 * Authorization Query: system-user administration surface.
 */
export default class AuthorizeSystemUserAdminAccessQuery {
  private readonly __instanceMarker = true

  static {
    void new AuthorizeSystemUserAdminAccessQuery().__instanceMarker
  }

  static async evaluate(userId: string, organizationId: string): Promise<PolicyResult> {
    const [actorSystemRole, membershipContext] = await Promise.all([
      userPublicApi.getSystemRoleName(userId),
      organizationPublicApi.getMembershipContext(organizationId, userId, undefined, true),
    ])

    const accessContext: SystemUserAccessContext = {
      actorSystemRole,
      actorOrgRole: membershipContext?.role ?? null,
    }

    return canAccessSystemUserAdministration(accessContext)
  }

  static async execute(userId: string, organizationId: string): Promise<boolean> {
    const decision = await this.evaluate(userId, organizationId)
    return decision.allowed
  }

  static async authorize(userId: string, organizationId: string): Promise<void> {
    enforcePolicy(await this.evaluate(userId, organizationId))
  }
}
