export interface OrganizationMemberSearchCandidatesInput {
  q: string
  limit: number
}

export interface OrganizationMemberSearchCandidate {
  userId: string
  score?: number
}

export interface OrganizationMemberSearchCandidateReader {
  searchUserCandidates(
    input: OrganizationMemberSearchCandidatesInput
  ): Promise<OrganizationMemberSearchCandidate[]>
}
