import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type { OrganizationMemberCandidateQuery } from '#modules/organizations/actions/dtos/request/members/organization_member_candidate_query'
import type { OrganizationMemberCandidatePage } from '#modules/organizations/actions/dtos/response/members/organization_member_candidate_page'

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
