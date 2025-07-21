import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import type { DatabaseId } from '#types/database'
import UserRepository from '#infra/users/repositories/user_repository'
import { canAccessUserAdministrationQueue } from '#domain/users/user_management_rules'

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
    const [actorSystemRole, actorOrgRole] = await Promise.all([
      UserRepository.getSystemRoleName(userId),
      OrganizationUserRepository.getMemberRoleName(organizationId, userId, undefined, true),
    ])

    return canAccessUserAdministrationQueue({
      actorSystemRole,
      actorOrgRole,
    }).allowed
  }
}
