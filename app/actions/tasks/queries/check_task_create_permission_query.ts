import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import UserRepository from '#infra/users/repositories/user_repository'
import type { DatabaseId } from '#types/database'

/**
 * Query: Check Task Create Permission
 *
 * Checks if user can create tasks in an organization.
 * User must be org_owner, org_admin, or system superadmin.
 */
export default class CheckTaskCreatePermissionQuery {
  private readonly __instanceMarker = true

  static {
    void new CheckTaskCreatePermissionQuery().__instanceMarker
  }

  static async execute(userId: DatabaseId, organizationId: DatabaseId): Promise<boolean> {
    const membership = await OrganizationUserRepository.findMembership(organizationId, userId)

    if (membership) {
      return membership.org_role === 'org_owner' || membership.org_role === 'org_admin'
    }

    return UserRepository.isSuperadmin(userId)
  }
}
