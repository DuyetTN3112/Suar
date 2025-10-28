import type { OrganizationSearchSyncReader } from '#modules/organizations/application/ports/organization_search_sync_reader'
import Organization from '#modules/organizations/infra/models/organization'

export class LucidOrganizationSearchSyncReader implements OrganizationSearchSyncReader {
  async listNotDeletedOrganizationIds(): Promise<string[]> {
    const organizations = await Organization.query().whereNull('deleted_at').select(['id'])
    return organizations.map((organization) => organization.id)
  }
}
