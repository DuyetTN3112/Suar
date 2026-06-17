import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type RequestOrganizationJoinCommand from '#modules/organizations/actions/commands/invitations/request_organization_join_command'

/**
 * Inbound construction contract for membership join requests.
 */
export abstract class OrganizationJoinRequestCommandFactory {
  abstract makeRequestJoin(context: OrganizationActionContext): RequestOrganizationJoinCommand
}
