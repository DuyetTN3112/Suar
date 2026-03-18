import type { OrganizationActionContext } from '#modules/organizations/members/actions/action_context'
import type ApprovePendingOrganizationMemberCommand from '#modules/organizations/members/actions/command/approve_pending_organization_member_command'

/**
 * Inbound construction contract for pending member approval.
 */
export abstract class OrganizationMemberApprovalCommandFactory {
  abstract make(context: OrganizationActionContext): ApprovePendingOrganizationMemberCommand
}
