import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import type {
  OrganizationMembershipRecord,
  OrganizationMembershipRepository,
} from '#modules/organizations/invitations/actions/ports/outbound/organization_persistence'

/**
 * Query: Find Pending Join Request
 *
 * Uses organization_users with status='pending'. Finds a pending membership by organization + user.
 * Used by ProcessJoinRequestController to resolve the request before passing to Command.
 */
export default class FindPendingJoinRequestQuery {
  constructor(private readonly memberships: OrganizationMembershipRepository) {}

  /**
   * Find a pending join request. Throws NotFoundException if not found.
   */
  async execute(
    organizationId: string,
    userId: string
  ): Promise<OrganizationMembershipRecord> {
    const membership = await this.memberships.findPending(
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
      created_at: membership.created_at,
      updated_at: membership.updated_at,
    }
  }
}
