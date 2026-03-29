import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import { OrganizationUserStatus } from '#constants/organization_constants'
import type { DatabaseId } from '#types/database'
import UserRepository from '#infra/users/repositories/user_repository'

/**
 * Query: Check Super Admin Permission
 *
 * Checks if user is a system-level admin OR an approved org_owner of the given organization.
 * Returns boolean — caller handles response.
 */
export default class CheckSuperAdminPermissionQuery {
  private readonly __instanceMarker = true

  static {
    void new CheckSuperAdminPermissionQuery().__instanceMarker
  }

  static async execute(userId: DatabaseId, organizationId: DatabaseId): Promise<boolean> {
    if (await UserRepository.isSystemAdmin(userId)) {
      return true
    }

    const membership = await OrganizationUserRepository.findMembership(organizationId, userId)

    return (
      !!membership &&
      membership.org_role === 'org_owner' &&
      membership.status === OrganizationUserStatus.APPROVED
    )
  }
}
