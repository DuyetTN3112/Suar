import type { OrganizationReader } from '#modules/organizations/actions/ports/outbound/directory/organization_persistence'

interface BasicOrgInfo {
  id: string
  name: string
}

/**
 * Query: Get Organization Basic Info
 *
 * Simple lookup for organization name/id, used by controllers
 * that need minimal org data for display (page titles, breadcrumbs, etc.)
 */
export default class GetOrganizationBasicInfoQuery {
  constructor(private readonly organizations: OrganizationReader) {}

  /**
   * Get basic organization info (id + name). Returns null if not found or deleted.
   */
  async execute(organizationId: string): Promise<BasicOrgInfo | null> {
    const organization = await this.organizations.findBasicInfo(organizationId)

    if (!organization) return null

    return { id: organization.id, name: organization.name }
  }

  /**
   * Get basic org info or throw NotFoundException.
   */
  async executeOrFail(organizationId: string): Promise<BasicOrgInfo> {
    const result = await this.execute(organizationId)
    if (!result) {
      const { default: NotFoundException } = await import('#modules/errors/public_contracts/not_found_exception')
      throw NotFoundException.resource('Tổ chức', organizationId)
    }
    return result
  }
}
