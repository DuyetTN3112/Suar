export interface AdminUserSearchCandidatesInput {
  q: string
  limit: number
}

export interface AdminUserSearchCandidate {
  userId: string
  score?: number
}

export interface AdminUserSearchCandidateReader {
  searchUserCandidates(input: AdminUserSearchCandidatesInput): Promise<AdminUserSearchCandidate[]>
}

export interface AdminOrganizationSearchCandidatesInput {
  q: string
  limit: number
}

export interface AdminOrganizationSearchCandidate {
  organizationId: string
  score?: number
}

export interface AdminOrganizationSearchCandidateReader {
  searchOrganizationCandidates(
    input: AdminOrganizationSearchCandidatesInput
  ): Promise<AdminOrganizationSearchCandidate[]>
}
