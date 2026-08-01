import type { SearchEngineCapability } from '#modules/search/public_contracts/search_engine'
import type {
  SkillSearchCandidate,
  SkillSearchCandidateReader,
  SkillSearchCandidatesInput,
} from '#modules/skills/actions/ports/outbound/skill_search_candidate_reader'

export class SearchSkillsCandidateReader implements SkillSearchCandidateReader {
  constructor(private readonly search: SearchEngineCapability) {}

  isEnabled(): boolean {
    return this.search.isEnabled()
  }

  async searchSkillCandidates(
    input: SkillSearchCandidatesInput
  ): Promise<SkillSearchCandidate[]> {
    const candidates = await this.search.searchSkills(input)
    return candidates.map((candidate) => ({
      skillId: candidate.skillId,
      score: candidate.score,
    }))
  }
}
