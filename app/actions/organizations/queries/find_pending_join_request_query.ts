import OrganizationJoinRequest from '#models/organization_join_request'
import { OrganizationUserStatus } from '#constants/organization_constants'
import type { DatabaseId } from '#types/database'
import NotFoundException from '#exceptions/not_found_exception'

/**
 * Query: Find Pending Join Request
 *
 * Finds a pending join request by organization + user.
 * Used by ProcessJoinRequestController to resolve the request before passing to Command.
 */
export default class FindPendingJoinRequestQuery {
  /**
   * Find a pending join request. Throws NotFoundException if not found.
   */
  static async execute(
    organizationId: DatabaseId,
    userId: DatabaseId
  ): Promise<OrganizationJoinRequest> {
    const joinRequest = await OrganizationJoinRequest.query()
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .where('status', OrganizationUserStatus.PENDING)
      .first()

    if (!joinRequest) {
      throw new NotFoundException('Không tìm thấy yêu cầu tham gia')
    }

    return joinRequest
  }
}
