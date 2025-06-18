import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import type { DatabaseId } from '#types/database'

interface FormattedUser {
  id: string
  username: string
  email: string | null
}

/**
 * Query: Get Users In Organization
 *
 * Returns users in the given organization, excluding the current user.
 * Sorted by username.
 */
export default class GetUsersInOrganizationQuery {
  async execute(organizationId: DatabaseId, excludeUserId: DatabaseId): Promise<FormattedUser[]> {
    const orgMembers = await OrganizationUserRepository.findMembersExcludingUser(
      organizationId,
      excludeUserId
    )

    return orgMembers
      .map((m) => ({
        id: m.user.id,
        username: m.user.username,
        email: m.user.email,
      }))
      .sort((a, b) => a.username.localeCompare(b.username))
  }
}
