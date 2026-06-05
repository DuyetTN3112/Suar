export interface OrganizationProjectSearchCandidatesInput {
  q: string
  limit: number
}

export interface OrganizationProjectSearchCandidate {
  projectId: string
  score?: number
}

export abstract class OrganizationProjectSearchCandidateReader {
  abstract isEnabled(): boolean
  abstract searchProjectCandidates(
    input: OrganizationProjectSearchCandidatesInput
  ): Promise<OrganizationProjectSearchCandidate[]>
}

export const disabledOrganizationProjectSearchCandidateReader: OrganizationProjectSearchCandidateReader =
  {
    isEnabled: () => false,
    searchProjectCandidates: () => Promise.resolve([]),
  }
