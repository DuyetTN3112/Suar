export interface OrganizationSearchCandidatesInput {
  q: string
  limit: number
}

export interface OrganizationSearchCandidate {
  organizationId: string
  score?: number
}

export interface OrganizationSearchCandidateReader {
  searchOrganizationCandidates(
    input: OrganizationSearchCandidatesInput
  ): Promise<OrganizationSearchCandidate[]>
}
