export interface RequiredOrganizationDirectoryInput {
  userId: string
  page: number
  perPage: number
  search?: string
}

export interface RequiredOrganizationDirectoryItem {
  id: string
  name: string
  description?: string | null
  logo?: string | null
  website?: string | null
  membership_status: string | null
}

export interface RequiredOrganizationDirectoryPage {
  data: RequiredOrganizationDirectoryItem[]
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
  }
}

export interface RequiredOrganizationDirectoryReader {
  getMembershipDirectoryPage(
    input: RequiredOrganizationDirectoryInput
  ): Promise<RequiredOrganizationDirectoryPage>
}
