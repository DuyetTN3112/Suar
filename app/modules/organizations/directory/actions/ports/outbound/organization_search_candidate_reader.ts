export interface OrganizationSearchCandidatesInput {
  q: string
  limit: number
}

export interface OrganizationSearchCandidate {
  organizationId: string
  score?: number
}

export abstract class OrganizationSearchCandidateReader {
  abstract isEnabled(): boolean
  abstract searchOrganizationCandidates(
    input: OrganizationSearchCandidatesInput
  ): Promise<OrganizationSearchCandidate[]>
}

export const disabledOrganizationSearchCandidateReader: OrganizationSearchCandidateReader = {
  isEnabled: () => false,
  searchOrganizationCandidates: () => Promise.resolve([]),
}
