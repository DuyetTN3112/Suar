import Organization from '#modules/organizations/directory/infra/models/organization'

export class LucidOrganizationSearchDocumentReader {
  async findOrganizationSearchDocumentRecord(organizationId: string) {
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
