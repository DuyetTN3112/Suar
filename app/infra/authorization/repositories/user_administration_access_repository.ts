import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import UserRepository from '#infra/users/repositories/user_repository'
import type { DatabaseId } from '#types/database'

export interface UserAdministrationAccessContext {
  actorSystemRole: string | null
  actorOrgRole: string | null
}

export async function getUserAdministrationAccessContext(
  userId: DatabaseId,
  organizationId: DatabaseId
): Promise<UserAdministrationAccessContext> {
  const [actorSystemRole, actorMembership] = await Promise.all([
    UserRepository.getSystemRoleName(userId),
    OrganizationUserRepository.getMembershipContext(organizationId, userId, undefined, true),
  ])

  return {
    actorSystemRole,
    actorOrgRole: actorMembership?.role ?? null,
  }
}
