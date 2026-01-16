import type { OrganizationActionContext } from '#modules/organizations/members/actions/action_context'
import type { OrganizationMemberCandidateQuery } from '#modules/organizations/members/actions/dtos/request/organization_member_candidate_query'
import type { OrganizationMemberCandidatePage } from '#modules/organizations/members/actions/dtos/response/organization_member_candidate_page'

/**
 * Organization-owned view of user-realm accounts that can be invited as members.
 *
 * Implementations belong to the outer composition layer so Organization
 * controllers never depend on Users application or transport internals.
 */
export abstract class OrganizationMemberCandidateReader {
  abstract listCandidates(
    context: OrganizationActionContext,
    query: OrganizationMemberCandidateQuery
  ): Promise<OrganizationMemberCandidatePage>
}
