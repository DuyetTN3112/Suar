import type { OrganizationSearchDocumentReader } from '#modules/organizations/application/ports/organization_search_document_reader'
import { organizationSearchDocumentReader as defaultOrganizationSearchDocumentReader } from '#modules/organizations/public_contracts/organization_search_indexing'
import type { OrganizationSearchDocument } from '#modules/search/domain/organization_search_document'

export class OrganizationSearchDocumentBuilder {
  constructor(
    private readonly organizationSearchDocumentReader: OrganizationSearchDocumentReader = defaultOrganizationSearchDocumentReader
  ) {}

  async build(organizationId: string): Promise<OrganizationSearchDocument> {
    const organization =
      await this.organizationSearchDocumentReader.findOrganizationSearchDocumentRecord(
        organizationId
      )

    return {
      organization_id: organization.organizationId,
      name: organization.name,
      slug: organization.slug,
      description: organization.description,
      website: organization.website,
      logo: organization.logo,
      deleted_at: organization.deletedAt,
      updated_at: organization.updatedAt,
    }
  }
}
