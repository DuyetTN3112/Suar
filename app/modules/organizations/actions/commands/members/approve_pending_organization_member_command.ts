import { BaseCommand } from '../base_command.js'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type { OrganizationPendingMemberApprovalGateway } from '#modules/organizations/actions/ports/outbound/members/organization_pending_member_approval_gateway'

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
export default class ApprovePendingOrganizationMemberCommand extends BaseCommand<
  ApprovePendingOrganizationMemberInput
> {
  constructor(
    protected override execCtx: OrganizationActionContext,
    private readonly approvalGateway: OrganizationPendingMemberApprovalGateway
  ) {
    super(execCtx)
  }

  async handle(input: ApprovePendingOrganizationMemberInput): Promise<void> {
    return this.execute(input)
  }

  execute(input: ApprovePendingOrganizationMemberInput): Promise<void> {
    const approverId = this.execCtx.userId
    if (!approverId) {
      throw new UnauthorizedException()
    }

    return this.approvalGateway.approvePendingMember(
      {
        organizationId: input.organizationId,
      targetUserId: input.targetUserId,
      approverId,
    },
      this.execCtx
    )
  }
}
