import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type ListOrganizationMemberCandidatesQuery from '#modules/organizations/actions/queries/members/list_organization_member_candidates_query'

/**
 * Inbound construction contract for addable-member candidates.
 */
export abstract class OrganizationMemberCandidateQueryFactory {
  abstract make(context: OrganizationActionContext): ListOrganizationMemberCandidatesQuery
}
