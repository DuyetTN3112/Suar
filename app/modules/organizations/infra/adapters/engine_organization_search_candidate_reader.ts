import type {
  OrganizationSearchCandidate,
  OrganizationSearchCandidateReader,
  OrganizationSearchCandidatesInput,
} from '#modules/organizations/actions/ports/organization_search_candidate_reader'
import { searchOrganizationsViaEngine } from '#modules/search/public_contracts/search_engine'

export class EngineOrganizationSearchCandidateReader
  implements OrganizationSearchCandidateReader
{
  async searchOrganizationCandidates(
    input: OrganizationSearchCandidatesInput
  ): Promise<OrganizationSearchCandidate[]> {
    return searchOrganizationsViaEngine(input)
  }
}
