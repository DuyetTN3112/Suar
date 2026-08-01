import type { OrganizationActionContext } from '#modules/organizations/invitations/actions/action_context'
import type RequestOrganizationJoinCommand from '#modules/organizations/invitations/actions/command/request_organization_join_command'

/**
 * Inbound construction contract for membership join requests.
 */
export abstract class OrganizationJoinRequestCommandFactory {
  abstract makeRequestJoin(context: OrganizationActionContext): RequestOrganizationJoinCommand
}
