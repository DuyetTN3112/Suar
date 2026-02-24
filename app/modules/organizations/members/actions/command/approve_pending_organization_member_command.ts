import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type { OrganizationActionContext } from '#modules/organizations/members/actions/action_context'
import type { OrganizationPendingMemberApprovalGateway } from '#modules/organizations/members/actions/ports/outbound/organization_pending_member_approval_gateway'

export interface ApprovePendingOrganizationMemberInput {
  organizationId: string
  targetUserId: string
}

/**
 * Organizations-owned approval intent.
 *
 * The gateway temporarily preserves the legacy Users workflow's authorization,
 * audit, and user-event behavior while the module ownership is migrated.
 */
export default class ApprovePendingOrganizationMemberCommand {
  constructor(
    private readonly context: OrganizationActionContext,
    private readonly approvalGateway: OrganizationPendingMemberApprovalGateway
  ) {}

  execute(input: ApprovePendingOrganizationMemberInput): Promise<void> {
    const approverId = this.context.userId
    if (!approverId) {
      throw new UnauthorizedException()
    }

    return this.approvalGateway.approvePendingMember(
      {
        organizationId: input.organizationId,
        targetUserId: input.targetUserId,
        approverId,
      },
      this.context
    )
  }
}
