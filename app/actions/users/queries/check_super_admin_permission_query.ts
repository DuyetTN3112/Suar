import OrganizationUserRepository from '#repositories/organization_user_repository'
import { OrganizationRole, OrganizationUserStatus } from '#constants/organization_constants'
import type { DatabaseId } from '#types/database'

/**
 * Query: Check Super Admin Permission
 *
 * Checks if user is an approved org_owner of the given organization.
 * Returns boolean — caller handles response.
 */
export default class CheckSuperAdminPermissionQuery {
  /**
   * Returns true if user is approved org_owner in the organization.
   */
  static async execute(userId: DatabaseId, organizationId: DatabaseId): Promise<boolean> {
    const membership = await OrganizationUserRepository.findMembership(organizationId, userId)

    return (
      !!membership &&
      membership.org_role === OrganizationRole.OWNER &&
      membership.status === OrganizationUserStatus.APPROVED
    )
  }
}
