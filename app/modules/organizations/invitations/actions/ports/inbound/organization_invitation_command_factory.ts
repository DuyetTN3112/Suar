import type { OrganizationActionContext } from '#modules/organizations/invitations/actions/action_context'
import type AcceptOrganizationInvitationCommand from '#modules/organizations/invitations/actions/command/accept_organization_invitation_command'
import type InviteUserCommand from '#modules/organizations/invitations/actions/command/invite_user_command'
import type ProcessJoinRequestCommand from '#modules/organizations/invitations/actions/command/process_join_request_command'
import type RejectOrganizationInvitationCommand from '#modules/organizations/invitations/actions/command/reject_organization_invitation_command'

/**
 * Inbound construction contract for invitation decision commands.
 */
export abstract class OrganizationInvitationCommandFactory {
  abstract makeInvite(context: OrganizationActionContext): InviteUserCommand
  abstract makeProcessJoinRequest(context: OrganizationActionContext): ProcessJoinRequestCommand
  abstract makeAccept(context: OrganizationActionContext): AcceptOrganizationInvitationCommand
  abstract makeReject(context: OrganizationActionContext): RejectOrganizationInvitationCommand
}
