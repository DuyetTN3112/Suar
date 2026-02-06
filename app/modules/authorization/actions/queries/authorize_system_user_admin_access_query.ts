import { enforcePolicy } from '#modules/authorization/actions/public_api'
import {
  canAccessSystemUserAdministration,
  type SystemUserAccessContext,
} from '#modules/authorization/domain/system_user_access_policy'
import { organizationPublicApi } from '#modules/organizations/actions/public_api'
import type { PolicyResult } from '#modules/policies/domain/policy_result'
import { userPublicApi } from '#modules/users/actions/public_api'
import type { DatabaseId } from '#types/database'

/**
 * Authorization Query: system-user administration surface.
 */
export default class AuthorizeSystemUserAdminAccessQuery {
  private readonly __instanceMarker = true

  static {
    void new AuthorizeSystemUserAdminAccessQuery().__instanceMarker
  }

  static async evaluate(userId: DatabaseId, organizationId: DatabaseId): Promise<PolicyResult> {
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

  static async execute(userId: DatabaseId, organizationId: DatabaseId): Promise<boolean> {
    const decision = await this.evaluate(userId, organizationId)
    return decision.allowed
  }

  static async authorize(userId: DatabaseId, organizationId: DatabaseId): Promise<void> {
    enforcePolicy(await this.evaluate(userId, organizationId))
  }
}
