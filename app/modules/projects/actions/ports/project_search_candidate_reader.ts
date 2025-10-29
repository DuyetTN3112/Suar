export interface ProjectSearchCandidatesInput {
  q: string
  limit: number
}

export interface ProjectSearchCandidate {
  projectId: string
  score?: number
}

export interface ProjectSearchCandidateReader {
  searchProjectCandidates(input: ProjectSearchCandidatesInput): Promise<ProjectSearchCandidate[]>
}
