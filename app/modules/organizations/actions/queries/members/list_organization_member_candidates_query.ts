import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type { OrganizationMemberCandidateQuery } from '#modules/organizations/actions/dtos/request/members/organization_member_candidate_query'
import type { OrganizationMemberCandidatePage } from '#modules/organizations/actions/dtos/response/members/organization_member_candidate_page'
import type { OrganizationMemberCandidateReader } from '#modules/organizations/actions/ports/outbound/members/organization_member_candidate_reader'
import { BaseQuery } from '#modules/organizations/actions/queries/base_query'

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
