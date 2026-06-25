export interface OrganizationDirectoryItem {
  id: string
  name: string
  description?: string | null
  logo?: string | null
  website?: string | null
}

export interface OrganizationMembershipDirectoryItem extends OrganizationDirectoryItem {
  membership_status: string | null
}

export interface OrganizationMembershipDirectoryPage {
  data: OrganizationMembershipDirectoryItem[]
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
  }
}

export interface OrganizationMembershipDirectoryInput {
  userId: string
  page: number
  perPage: number
  search?: string
  plan?: string
  partnerType?: string
  partnerIsActive?: boolean
  createdAtStart?: string
  createdAtEnd?: string
}

export interface OrganizationDirectoryCapability {
  searchBasicList(query: string, limit?: number): Promise<OrganizationDirectoryItem[]>
  getMembershipDirectoryPage(
    input: OrganizationMembershipDirectoryInput
  ): Promise<OrganizationMembershipDirectoryPage>
}
