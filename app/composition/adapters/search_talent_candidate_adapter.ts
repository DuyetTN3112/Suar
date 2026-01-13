import type { SearchEngineCapability } from '#modules/search/public_contracts/search_engine'
import type {
  TalentSearchCandidate,
  TalentSearchCandidateReader,
  TalentSearchCandidatesInput,
} from '#modules/users/actions/ports/outbound/talent_search_candidate_reader'

export class SearchTalentCandidateAdapter implements TalentSearchCandidateReader {
  constructor(private readonly searchEngine: SearchEngineCapability) {}

  isEnabled(): boolean {
    return this.searchEngine.isEnabled()
  }

  async searchTalentCandidates(
    input: TalentSearchCandidatesInput,
    signal?: AbortSignal
  ): Promise<TalentSearchCandidate[]> {
    const candidates = await this.searchEngine.searchTalents(
      {
        q: input.q,
        limit: input.limit,
      },
      signal
    )

    return candidates.map((candidate) => ({
      userId: candidate.userId,
      score: candidate.score,
    }))
  }
}
