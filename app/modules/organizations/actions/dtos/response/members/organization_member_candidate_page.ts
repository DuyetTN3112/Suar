export interface OrganizationMemberCandidate {
  id: string
  username: string
  email: string
  status: string
}

export interface OrganizationMemberCandidatePage {
  data: OrganizationMemberCandidate[]
  pagination: {
    page: number
    perPage: number
    total: number
    lastPage: number
  }
}
