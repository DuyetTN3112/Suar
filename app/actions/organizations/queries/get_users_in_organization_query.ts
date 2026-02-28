import type { HttpContext } from '@adonisjs/core/http'
import OrganizationUser from '#models/organization_user'
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
  constructor(protected ctx: HttpContext) {}

  async execute(organizationId: DatabaseId, excludeUserId: DatabaseId): Promise<FormattedUser[]> {
    const orgMembers = await OrganizationUser.query()
      .where('organization_id', organizationId)
      .whereNot('user_id', excludeUserId)
      .preload('user')

    return orgMembers
      .map((m) => ({
        id: String(m.user.id),
        username: m.user.username,
        email: m.user.email,
      }))
      .sort((a, b) => a.username.localeCompare(b.username))
  }
}
