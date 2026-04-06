import {
  searchPublicTasksViaEngine,
  searchTasksViaEngine,
} from '#modules/search/public_contracts/search_engine'
import type {
  OrganizationTaskSearchCandidate,
  OrganizationTaskSearchCandidateReader,
  OrganizationTaskSearchCandidatesInput,
  PublicTaskSearchCandidate,
  PublicTaskSearchCandidateReader,
  PublicTaskSearchCandidatesInput,
} from '#modules/tasks/actions/ports/task_search_candidate_readers'

export class EnginePublicTaskSearchCandidateReader implements PublicTaskSearchCandidateReader {
  async searchPublicTaskCandidates(
    input: PublicTaskSearchCandidatesInput
  ): Promise<PublicTaskSearchCandidate[]> {
    return searchPublicTasksViaEngine(input)
  }
}

export class EngineOrganizationTaskSearchCandidateReader
  implements OrganizationTaskSearchCandidateReader
{
  async searchOrganizationTaskCandidates(
    input: OrganizationTaskSearchCandidatesInput
  ): Promise<OrganizationTaskSearchCandidate[]> {
    return searchTasksViaEngine(input)
  }
}
