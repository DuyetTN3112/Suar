import type {
  OrganizationProjectSearchCandidate,
  OrganizationProjectSearchCandidateReader,
  OrganizationProjectSearchCandidatesInput,
} from '#modules/organizations/actions/ports/organization_project_search_candidate_reader'
import { searchProjectsViaEngine } from '#modules/search/public_contracts/search_engine'

export class EngineOrganizationProjectSearchCandidateReader
  implements OrganizationProjectSearchCandidateReader
{
  async searchProjectCandidates(
    input: OrganizationProjectSearchCandidatesInput
  ): Promise<OrganizationProjectSearchCandidate[]> {
    return searchProjectsViaEngine(input)
  }
}
