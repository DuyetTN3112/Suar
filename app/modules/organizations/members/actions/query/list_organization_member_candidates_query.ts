import type { OrganizationActionContext } from '#modules/organizations/members/actions/action_context'
import type { OrganizationMemberCandidateQuery } from '#modules/organizations/members/actions/dtos/request/organization_member_candidate_query'
import type { OrganizationMemberCandidatePage } from '#modules/organizations/members/actions/dtos/response/organization_member_candidate_page'
import type { OrganizationMemberCandidateReader } from '#modules/organizations/members/actions/ports/outbound/organization_member_candidate_reader'
import { BaseQuery } from '#modules/organizations/members/actions/query/base_query'

export default class ListOrganizationMemberCandidatesQuery extends BaseQuery<
  OrganizationMemberCandidateQuery,
  OrganizationMemberCandidatePage
> {
  constructor(
    context: OrganizationActionContext,
    private readonly candidates: OrganizationMemberCandidateReader
  ) {
    super(context)
  }

  handle(input: OrganizationMemberCandidateQuery): Promise<OrganizationMemberCandidatePage> {
    return this.candidates.listCandidates(this.execCtx, input)
  }
}
