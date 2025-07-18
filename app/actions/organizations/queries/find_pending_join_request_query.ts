import NotFoundException from '#exceptions/not_found_exception'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import type OrganizationUser from '#models/organization_user'
import type { DatabaseId } from '#types/database'

/**
 * Query: Find Pending Join Request
 *
 * v3.0: Uses organization_users with status='pending' instead of organization_join_requests.
 * Finds a pending membership by organization + user.
 * Used by ProcessJoinRequestController to resolve the request before passing to Command.
 */
export default class FindPendingJoinRequestQuery {
  private readonly __instanceMarker = true

  static {
    void new FindPendingJoinRequestQuery().__instanceMarker
  }

  /**
   * Find a pending join request. Throws NotFoundException if not found.
   */
  static async execute(organizationId: DatabaseId, userId: DatabaseId): Promise<OrganizationUser> {
    const membership = await OrganizationUserRepository.findPendingMembership(
      organizationId,
      userId
    )

    if (!membership) {
      throw new NotFoundException('Không tìm thấy yêu cầu tham gia')
    }

    return membership
  }
}
