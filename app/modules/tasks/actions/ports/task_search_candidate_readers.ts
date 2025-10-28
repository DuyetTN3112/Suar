export interface PublicTaskSearchCandidatesInput {
  q: string
  limit: number
}

export interface PublicTaskSearchCandidate {
  taskId: string
  score?: number
}

export interface PublicTaskSearchCandidateReader {
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
  searchOrganizationTaskCandidates(
    input: OrganizationTaskSearchCandidatesInput
  ): Promise<OrganizationTaskSearchCandidate[]>
}
