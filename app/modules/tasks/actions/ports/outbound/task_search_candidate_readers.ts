export interface PublicTaskSearchCandidatesInput {
  q: string
  limit: number
}

export interface PublicTaskSearchCandidate {
  taskId: string
  score?: number
}

export interface PublicTaskSearchCandidateReader {
  isEnabled(): boolean
  searchPublicTaskCandidates(
    input: PublicTaskSearchCandidatesInput
  ): Promise<PublicTaskSearchCandidate[]>
}

export interface OrganizationTaskSearchCandidatesInput {
  q: string
  organizationId: string
  limit: number
}

export interface OrganizationTaskSearchCandidate {
  taskId: string
  score?: number
}

export interface OrganizationTaskSearchCandidateReader {
  isEnabled(): boolean
  searchOrganizationTaskCandidates(
    input: OrganizationTaskSearchCandidatesInput
  ): Promise<OrganizationTaskSearchCandidate[]>
}
