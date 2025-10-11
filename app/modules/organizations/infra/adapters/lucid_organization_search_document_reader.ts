import type {
  OrganizationSearchDocumentReader,
  OrganizationSearchDocumentRecord,
} from '#modules/organizations/application/ports/organization_search_document_reader'
import Organization from '#modules/organizations/infra/models/organization'

export class LucidOrganizationSearchDocumentReader implements OrganizationSearchDocumentReader {
  async findOrganizationSearchDocumentRecord(
    organizationId: string
  ): Promise<OrganizationSearchDocumentRecord> {
    const organization = await Organization.findOrFail(organizationId)

    return {
      organizationId: organization.id,
      name: organization.name,
      slug: organization.slug,
      description: organization.description,
      website: organization.website,
      logo: organization.logo,
      deletedAt: organization.deleted_at?.toISO() ?? null,
      updatedAt: organization.updated_at.toISO() ?? new Date().toISOString(),
    }
  }
}
