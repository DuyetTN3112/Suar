import type { OrganizationMembershipRepository } from '#modules/organizations/members/actions/ports/outbound/organization_persistence'

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
  constructor(private readonly memberships: OrganizationMembershipRepository) {}

  async execute(organizationId: string, excludeUserId: string): Promise<FormattedUser[]> {
    const orgMembers = await this.memberships.findMembersExcludingUser(
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
