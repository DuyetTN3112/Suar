export interface TalentSearchCandidatesInput {
  q: string
  limit: number
}

export interface TalentSearchCandidate {
  userId: string
  score?: number
}

export interface TalentSearchCandidateReader {
  searchTalentCandidates(input: TalentSearchCandidatesInput): Promise<TalentSearchCandidate[]>
}
