import { authorizationUserIdentityReader } from '#modules/authorization/actions/ports/outbound/authorization_user_identity_reader'
import {
  canAccessSystemUserAdministration,
  type SystemUserAccessContext,
} from '#modules/authorization/domain/system_user_access_policy'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import type { PolicyResult } from '#modules/authorization/public_contracts/policy_result'

/**
 * Authorization Query: system-user administration surface.
 */
export default class AuthorizeSystemUserAdminAccessQuery {
  private readonly __instanceMarker = true

  static {
    void new AuthorizeSystemUserAdminAccessQuery().__instanceMarker
  }

  static async evaluate(userId: string, _organizationId: string): Promise<PolicyResult> {
    const actorSystemRole = await authorizationUserIdentityReader.getSystemRoleName(userId)

    const accessContext: SystemUserAccessContext = {
      actorSystemRole,
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
