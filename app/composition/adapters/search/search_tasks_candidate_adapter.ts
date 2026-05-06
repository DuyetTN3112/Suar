import type { SearchEngineCapability } from '#modules/search/public_contracts/search_engine'
import type {
  OrganizationTaskSearchCandidate,
  OrganizationTaskSearchCandidateReader,
  OrganizationTaskSearchCandidatesInput,
  PublicTaskSearchCandidate,
  PublicTaskSearchCandidateReader,
  PublicTaskSearchCandidatesInput,
} from '#modules/tasks/actions/ports/outbound/task_search_candidate_readers'

export class SearchTasksCandidateAdapter
  implements PublicTaskSearchCandidateReader, OrganizationTaskSearchCandidateReader
{
  constructor(private readonly searchEngine: SearchEngineCapability) {}

  isEnabled(): boolean {
    return this.searchEngine.isEnabled()
  }

  async searchPublicTaskCandidates(
    input: PublicTaskSearchCandidatesInput
  ): Promise<PublicTaskSearchCandidate[]> {
    const candidates = await this.searchEngine.searchPublicTasks({
      q: input.q,
      limit: input.limit,
    })

    return candidates.map((candidate) => ({
      taskId: candidate.taskId,
      score: candidate.score,
    }))
  }

  async searchOrganizationTaskCandidates(
    input: OrganizationTaskSearchCandidatesInput
  ): Promise<OrganizationTaskSearchCandidate[]> {
    const candidates = await this.searchEngine.searchTasks({
      q: input.q,
      organizationId: input.organizationId,
      limit: input.limit,
    })

    return candidates.map((candidate) => ({
      taskId: candidate.taskId,
      score: candidate.score,
    }))
  }
}
