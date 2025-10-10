import type {
  OrganizationMemberSearchCandidate,
  OrganizationMemberSearchCandidateReader,
  OrganizationMemberSearchCandidatesInput,
} from '#modules/organizations/actions/ports/organization_member_search_candidate_reader'
import { searchUsersViaEngine } from '#modules/search/public_contracts/search_engine'

export class EngineOrganizationMemberSearchCandidateReader
  implements OrganizationMemberSearchCandidateReader
{
  async searchUserCandidates(
    input: OrganizationMemberSearchCandidatesInput
  ): Promise<OrganizationMemberSearchCandidate[]> {
    return searchUsersViaEngine(input)
  }
}
