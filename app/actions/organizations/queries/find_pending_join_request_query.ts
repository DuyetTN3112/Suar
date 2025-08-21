import NotFoundException from '#exceptions/not_found_exception'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import type { DatabaseId } from '#types/database'
import type { OrganizationMembershipRecord } from '#types/organization_records'

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
  static async execute(
    organizationId: DatabaseId,
    userId: DatabaseId
  ): Promise<OrganizationMembershipRecord> {
    const membership = await OrganizationUserRepository.findPendingMembership(
      organizationId,
      userId
    )

    if (!membership) {
      throw new NotFoundException('Không tìm thấy yêu cầu tham gia')
    }

    return {
      organization_id: membership.organization_id,
      user_id: membership.user_id,
      org_role: membership.org_role,
      status: membership.status,
      invited_by: membership.invited_by,
      created_at: membership.created_at.toISO(),
      updated_at: membership.updated_at.toISO(),
    }
  }
}
