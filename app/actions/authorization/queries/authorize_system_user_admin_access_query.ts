import { enforcePolicy } from '#actions/authorization/enforce_policy'
import {
  canAccessSystemUserAdministration,
  type SystemUserAccessContext,
} from '#domain/authorization/system_user_access_policy'
import type { PolicyResult } from '#domain/policies/policy_result'
import { getUserAdministrationAccessContext } from '#infra/authorization/repositories/user_administration_access_repository'
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
    const accessContext: SystemUserAccessContext = await getUserAdministrationAccessContext(
      userId,
      organizationId
    )

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
