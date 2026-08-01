import Organization from '#modules/organizations/directory/infra/models/organization'

export class LucidOrganizationSearchSyncReader {
  async listNotDeletedOrganizationIds(): Promise<string[]> {
    const organizations = await Organization.query().whereNull('deleted_at').select(['id'])
    return organizations.map((organization) => organization.id)
  }
}
