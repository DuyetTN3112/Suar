import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type ApprovePendingOrganizationMemberCommand from '#modules/organizations/actions/commands/members/approve_pending_organization_member_command'

/**
 * Inbound construction contract for pending member approval.
 */
export abstract class OrganizationMemberApprovalCommandFactory {
  abstract make(context: OrganizationActionContext): ApprovePendingOrganizationMemberCommand
}
