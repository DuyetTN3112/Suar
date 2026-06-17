import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type AcceptOrganizationInvitationCommand from '#modules/organizations/actions/commands/invitations/accept_organization_invitation_command'
import type InviteUserCommand from '#modules/organizations/actions/commands/invitations/invite_user_command'
import type ProcessJoinRequestCommand from '#modules/organizations/actions/commands/invitations/process_join_request_command'
import type RejectOrganizationInvitationCommand from '#modules/organizations/actions/commands/invitations/reject_organization_invitation_command'

/**
 * Inbound construction contract for invitation decision commands.
 */
export abstract class OrganizationInvitationCommandFactory {
  abstract makeInvite(context: OrganizationActionContext): InviteUserCommand
  abstract makeProcessJoinRequest(context: OrganizationActionContext): ProcessJoinRequestCommand
  abstract makeAccept(context: OrganizationActionContext): AcceptOrganizationInvitationCommand
  abstract makeReject(context: OrganizationActionContext): RejectOrganizationInvitationCommand
}
