import type {
  ProjectSearchCandidate,
  ProjectSearchCandidateReader,
  ProjectSearchCandidatesInput,
} from '#modules/projects/actions/ports/outbound/project_search_candidate_reader'
import type { SearchEngineCapability } from '#modules/search/public_contracts/search_engine'

export class SearchProjectsCandidateReaderAdapter implements ProjectSearchCandidateReader {
  constructor(private readonly searchEngine: SearchEngineCapability) {}

  isEnabled(): boolean {
    return this.searchEngine.isEnabled()
  }

  async searchProjectCandidates(
    input: ProjectSearchCandidatesInput
  ): Promise<ProjectSearchCandidate[]> {
    const candidates = await this.searchEngine.searchProjects({
      q: input.q,
      limit: input.limit,
    })

    return candidates.map((candidate) => ({
      projectId: candidate.projectId,
      score: candidate.score,
    }))
  }
}
