import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type GetInvitationsIndexPageQuery from '#modules/organizations/actions/queries/invitations/get_invitations_index_page_query'
import type ListInvitationsQuery from '#modules/organizations/actions/queries/invitations/list_invitations_query'
import type ListJoinRequestsQuery from '#modules/organizations/actions/queries/invitations/list_join_requests_query'

/**
 * Inbound construction contract for invitation and join-request reads.
 */
export abstract class OrganizationInvitationQueryFactory {
  abstract makeListInvitations(context: OrganizationActionContext): ListInvitationsQuery
  abstract makeInvitationsIndexPage(
    context: OrganizationActionContext
  ): GetInvitationsIndexPageQuery
  abstract makeListJoinRequests(context: OrganizationActionContext): ListJoinRequestsQuery
}
