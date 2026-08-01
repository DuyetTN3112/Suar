export interface TalentSearchCandidatesInput {
  q: string
  limit: number
}

export interface TalentSearchCandidate {
  userId: string
  score?: number
}

export interface TalentSearchCandidateReader {
  isEnabled(): boolean
  searchTalentCandidates(
    input: TalentSearchCandidatesInput,
    signal?: AbortSignal
  ): Promise<TalentSearchCandidate[]>
}
