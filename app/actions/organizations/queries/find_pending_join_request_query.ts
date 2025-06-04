import OrganizationUser from '#models/organization_user'
import { OrganizationUserStatus } from '#constants/organization_constants'
import type { DatabaseId } from '#types/database'
import NotFoundException from '#exceptions/not_found_exception'

/**
 * Query: Find Pending Join Request
 *
 * v3.0: Uses organization_users with status='pending' instead of organization_join_requests.
 * Finds a pending membership by organization + user.
 * Used by ProcessJoinRequestController to resolve the request before passing to Command.
 */
export default class FindPendingJoinRequestQuery {
  /**
   * Find a pending join request. Throws NotFoundException if not found.
   */
  static async execute(organizationId: DatabaseId, userId: DatabaseId): Promise<OrganizationUser> {
    const membership = await OrganizationUser.query()
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .where('status', OrganizationUserStatus.PENDING)
      .first()

    if (!membership) {
      throw new NotFoundException('Không tìm thấy yêu cầu tham gia')
    }

    return membership
  }
}
