import { enforcePolicy } from '#actions/authorization/public_api'
import { organizationPublicApi } from '#actions/organizations/public_api'
import { userPublicApi } from '#actions/users/public_api'
import {
  canAccessSystemUserAdministration,
  type SystemUserAccessContext,
} from '#domain/authorization/system_user_access_policy'
import type { PolicyResult } from '#domain/policies/policy_result'
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
