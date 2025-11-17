import { searchTalentsViaEngine } from '#modules/search/public_contracts/search_engine'
import type {
  TalentSearchCandidate,
  TalentSearchCandidateReader,
  TalentSearchCandidatesInput,
} from '#modules/users/actions/ports/talent_search_candidate_reader'

export class EngineTalentSearchCandidateReader implements TalentSearchCandidateReader {
  async searchTalentCandidates(
    input: TalentSearchCandidatesInput
  ): Promise<TalentSearchCandidate[]> {
    return searchTalentsViaEngine(input)
  }
}
