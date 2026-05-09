import { makeApproveUserCommand } from '#composition/users/user-factories/user_action_factory'

import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type {
  OrganizationPendingMemberApprovalGateway,
  OrganizationPendingMemberApprovalInput,
} from '#modules/organizations/actions/ports/outbound/members/organization_pending_member_approval_gateway'
import { ApproveUserDTO } from '#modules/users/actions/dtos/request/approve_user_dto'

/**
 * Preserves the legacy Users approval behavior behind an Organizations-owned port.
 */
export class OrganizationPendingMemberApprovalAdapter implements OrganizationPendingMemberApprovalGateway {
  async approvePendingMember(
    input: OrganizationPendingMemberApprovalInput,
    context: OrganizationActionContext
  ): Promise<void> {
    const command = makeApproveUserCommand(context)

    await command.handle(
      new ApproveUserDTO(input.targetUserId, input.organizationId, input.approverId)
    )
  }
}
