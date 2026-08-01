import type { OrganizationActionContext } from '#modules/organizations/members/actions/action_context'
import type BulkAddMembersCommand from '#modules/organizations/members/actions/command/bulk_add_members_command'

/**
 * Inbound construction contract for membership commands.
 */
export abstract class OrganizationMembershipCommandFactory {
  abstract makeBulkAdd(context: OrganizationActionContext): BulkAddMembersCommand
}
