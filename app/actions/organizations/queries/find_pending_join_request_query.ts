import type OrganizationUser from '#models/organization_user'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
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
