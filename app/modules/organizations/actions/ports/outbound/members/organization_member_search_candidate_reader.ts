export interface OrganizationMemberSearchCandidatesInput {
  q: string
  limit: number
}

export interface OrganizationMemberSearchCandidate {
  userId: string
  score?: number
}

export abstract class OrganizationMemberSearchCandidateReader {
  abstract isEnabled(): boolean
  abstract searchUserCandidates(
    input: OrganizationMemberSearchCandidatesInput
  ): Promise<OrganizationMemberSearchCandidate[]>
}

export const disabledOrganizationMemberSearchCandidateReader: OrganizationMemberSearchCandidateReader =
  {
    isEnabled: () => false,
    searchUserCandidates: () => Promise.resolve([]),
  }
