import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import UserRepository from '#infra/users/repositories/user_repository'
import { OrganizationRole } from '#constants/organization_constants'
import type { DatabaseId } from '#types/database'

/**
 * Query: Check Task Create Permission
 *
 * Checks if user can create tasks in an organization.
 * User must be org_owner, org_admin, or system superadmin.
 */
export default class CheckTaskCreatePermissionQuery {
  static async execute(userId: DatabaseId, organizationId: DatabaseId): Promise<boolean> {
    const membership = await OrganizationUserRepository.findMembership(organizationId, userId)

    if (membership) {
      return (
        membership.org_role === OrganizationRole.OWNER ||
        membership.org_role === OrganizationRole.ADMIN
      )
    }

    return UserRepository.isSuperadmin(userId)
  }
}
