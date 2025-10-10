export interface OrganizationProjectSearchCandidatesInput {
  q: string
  limit: number
}

export interface OrganizationProjectSearchCandidate {
  projectId: string
  score?: number
}

export interface OrganizationProjectSearchCandidateReader {
  searchProjectCandidates(
    input: OrganizationProjectSearchCandidatesInput
  ): Promise<OrganizationProjectSearchCandidate[]>
}
