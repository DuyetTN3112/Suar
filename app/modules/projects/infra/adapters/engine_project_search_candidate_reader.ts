import type {
  ProjectSearchCandidate,
  ProjectSearchCandidateReader,
  ProjectSearchCandidatesInput,
} from '#modules/projects/actions/ports/project_search_candidate_reader'
import { searchProjectsViaEngine } from '#modules/search/public_contracts/search_engine'

export class EngineProjectSearchCandidateReader implements ProjectSearchCandidateReader {
  async searchProjectCandidates(
    input: ProjectSearchCandidatesInput
  ): Promise<ProjectSearchCandidate[]> {
    return searchProjectsViaEngine(input)
  }
}
