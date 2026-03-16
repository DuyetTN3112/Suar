import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import { OrganizationRole, OrganizationUserStatus } from '#constants/organization_constants'
import type { DatabaseId } from '#types/database'
import User from '#models/user'

/**
 * Query: Check Super Admin Permission
 *
 * Checks if user is a system-level admin OR an approved org_owner of the given organization.
 * Returns boolean — caller handles response.
 */
export default class CheckSuperAdminPermissionQuery {
  static async execute(userId: DatabaseId, organizationId: DatabaseId): Promise<boolean> {
    const user = await User.find(userId)
    if (user?.isAdmin) {
      return true
    }

    const membership = await OrganizationUserRepository.findMembership(organizationId, userId)

    return (
      !!membership &&
      membership.org_role === OrganizationRole.OWNER &&
      membership.status === OrganizationUserStatus.APPROVED
    )
  }
}
