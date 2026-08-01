import type { OrganizationActionContext } from '#modules/organizations/members/actions/action_context'
import type GetOrganizationMembersIndexPageQuery from '#modules/organizations/members/actions/query/get_organization_members_index_page_query'
import type ListOrganizationMembersQuery from '#modules/organizations/members/actions/query/list_organization_members_query'

/**
 * Inbound construction contract for member-directory queries.
 */
export abstract class OrganizationMemberQueryFactory {
  abstract makeListMembers(context: OrganizationActionContext): ListOrganizationMembersQuery
  abstract makeMembersIndexPage(
    context: OrganizationActionContext
  ): GetOrganizationMembersIndexPageQuery
}
