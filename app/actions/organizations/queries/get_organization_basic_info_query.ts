import Organization from '#models/organization'
import type { DatabaseId } from '#types/database'

interface BasicOrgInfo {
  id: DatabaseId
  name: string
}

/**
 * Query: Get Organization Basic Info
 *
 * Simple lookup for organization name/id, used by controllers
 * that need minimal org data for display (page titles, breadcrumbs, etc.)
 */
export default class GetOrganizationBasicInfoQuery {
  /**
   * Get basic organization info (id + name). Returns null if not found or deleted.
   */
  static async execute(organizationId: DatabaseId): Promise<BasicOrgInfo | null> {
    const organization = await Organization.query()
      .where('id', organizationId)
      .whereNull('deleted_at')
      .select('id', 'name')
      .first()

    if (!organization) return null

    return { id: organization.id, name: organization.name }
  }

  /**
   * Get basic org info or throw NotFoundException.
   */
  static async executeOrFail(organizationId: DatabaseId): Promise<BasicOrgInfo> {
    const result = await this.execute(organizationId)
    if (!result) {
      const { default: NotFoundException } = await import('#exceptions/not_found_exception')
      throw NotFoundException.resource('Tổ chức', organizationId)
    }
    return result
  }
}
