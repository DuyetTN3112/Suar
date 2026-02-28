import type { HttpContext } from '@adonisjs/core/http'
import OrganizationUser from '#models/organization_user'
import { OrganizationUserStatus } from '#constants/organization_constants'
import type { DatabaseId } from '#types/database'

interface PendingUser {
  id: DatabaseId
  email: string
  username: string
  system_role: string
  status: string
  avatar_url: string | null
  created_at: string
}

/**
 * Query: Get Pending Approval Users
 *
 * Returns users who are pending approval in the current organization.
 * Also provides a count-only method for badge display.
 */
export default class GetPendingApprovalUsersQuery {
  constructor(protected ctx: HttpContext) {}

  /**
   * Get list of pending approval users in the organization.
   */
  async getList(organizationId: DatabaseId): Promise<PendingUser[]> {
    const pendingMemberships = await OrganizationUser.query()
      .where('organization_id', organizationId)
      .where('status', OrganizationUserStatus.PENDING)
      .preload('user', (q) => {
        void q
          .select(['id', 'email', 'username', 'system_role', 'status', 'created_at', 'avatar_url'])
          .whereNull('deleted_at')
      })

    return pendingMemberships
      .filter((m) => m.user)
      .map((m) => ({
        id: m.user.id,
        email: m.user.email ?? '',
        username: m.user.username,
        system_role: m.user.system_role,
        status: m.user.status,
        avatar_url: m.user.avatar_url,
        created_at: m.user.created_at?.toISO() ?? '',
      }))
  }

  /**
   * Get count of pending approval users in the organization.
   */
  async getCount(organizationId: DatabaseId): Promise<number> {
    const count = await OrganizationUser.query()
      .where('organization_id', organizationId)
      .where('status', OrganizationUserStatus.PENDING)
      .count('user_id as count')
      .first()

    return Number((count as any)?.$extras?.count || 0)
  }
}
