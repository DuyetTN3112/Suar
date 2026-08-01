export interface AdminUserSearchCandidatesInput {
  q: string
  limit: number
}

export interface AdminUserSearchCandidate {
  userId: string
  score?: number
}

export abstract class AdminUserSearchCandidateReader {
  abstract isEnabled(): boolean
  abstract searchUserCandidates(
    input: AdminUserSearchCandidatesInput
  ): Promise<AdminUserSearchCandidate[]>
}

export interface AdminOrganizationSearchCandidatesInput {
  q: string
  limit: number
}

export interface AdminOrganizationSearchCandidate {
  organizationId: string
  score?: number
}

export abstract class AdminOrganizationSearchCandidateReader {
  abstract isEnabled(): boolean
  abstract searchOrganizationCandidates(
    input: AdminOrganizationSearchCandidatesInput
  ): Promise<AdminOrganizationSearchCandidate[]>
}
