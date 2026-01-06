export interface OrganizationSearchDocumentRecord {
  organizationId: string
  name: string
  slug: string
  description: string | null
  website: string | null
  logo: string | null
  deletedAt: string | null
  updatedAt: string
}

export interface OrganizationSearchDocumentReader {
  findOrganizationSearchDocumentRecord(
    organizationId: string
  ): Promise<OrganizationSearchDocumentRecord>
}
