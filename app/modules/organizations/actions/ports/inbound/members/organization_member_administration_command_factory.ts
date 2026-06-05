import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type RemoveMemberCommand from '#modules/organizations/actions/commands/members/remove_member_command'
import type UpdateMemberRoleCommand from '#modules/organizations/actions/commands/members/update_member_role_command'

/**
 * Inbound construction contract for organization member administration.
 */
export abstract class OrganizationMemberAdministrationCommandFactory {
  abstract makeRemove(context: OrganizationActionContext): RemoveMemberCommand
  abstract makeUpdateRole(context: OrganizationActionContext): UpdateMemberRoleCommand
}
