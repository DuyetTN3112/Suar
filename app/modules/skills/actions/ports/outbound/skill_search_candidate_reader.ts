export interface SkillSearchCandidatesInput {
  q: string
  limit: number
}

export interface SkillSearchCandidate {
  skillId: string
  score: number
}

export interface SkillSearchCandidateReader {
  isEnabled(): boolean
  searchSkillCandidates(input: SkillSearchCandidatesInput): Promise<SkillSearchCandidate[]>
}
