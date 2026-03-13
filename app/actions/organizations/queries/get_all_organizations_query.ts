import type { HttpContext } from '@adonisjs/core/http'
import Organization from '#models/organization'
import OrganizationUser from '#models/organization_user'
import OrganizationUserRepository from '#repositories/organization_user_repository'
import User from '#models/user'
import type { DatabaseId } from '#types/database'

interface EnhancedOrganization {
  id: DatabaseId
  name: string
  description?: string | null
  logo?: string | null
  website?: string | null
  plan?: string | null
  founded_date: string
  owner: string
  employee_count: number
  project_count: null
  industry: null
  location: null
  [key: string]: unknown
}

interface AllOrganizationsWithMembership {
  id: DatabaseId
  name: string
  membership_status: string | null
  [key: string]: unknown
}

/**
 * Query: Get All Organizations
 *
 * Loads all active organizations with various data shapes
 * depending on the caller's needs.
 */
export default class GetAllOrganizationsQuery {
  constructor(protected ctx: HttpContext) {}

  /**
   * Get all organizations enhanced with owner names and member counts.
   * Used by ListOrganizationsController.
   */
  async getEnhanced(): Promise<EnhancedOrganization[]> {
    const allOrganizations = await Organization.query().whereNull('deleted_at').orderBy('id', 'asc')

    const orgIds = allOrganizations.map((org) => org.id)

    // Batch query: owner usernames
    const ownerIds = [...new Set(allOrganizations.map((org) => org.owner_id))]
    const owners = await User.query().whereIn('id', ownerIds).select('id', 'username')
    const ownerMap = new Map(owners.map((o) => [o.id, o.username]))

    // Batch query: member counts
    const memberCountMap = await OrganizationUserRepository.countMembersByOrgIds(orgIds)

    return allOrganizations.map((org) => ({
      ...org.toJSON(),
      id: org.id,
      name: org.name,
      founded_date: '2023',
      owner: ownerMap.get(org.owner_id) || 'Admin',
      employee_count: memberCountMap.get(org.id) || 0,
      project_count: null,
      industry: null,
      location: null,
    }))
  }

  /**
   * Get all organizations with current user's membership status.
   * Used by AllOrganizationsController.
   */
  async getWithMembershipStatus(userId: DatabaseId): Promise<AllOrganizationsWithMembership[]> {
    const organizations = await Organization.query().whereNull('deleted_at').orderBy('id', 'asc')

    const memberships = await OrganizationUser.query()
      .where('user_id', userId)
      .select('organization_id', 'status')

    return organizations.map((org) => {
      const membership = memberships.find((m) => m.organization_id === org.id)
      return {
        ...org.toJSON(),
        id: org.id,
        name: org.name,
        membership_status: membership ? membership.status : null,
      }
    })
  }

  /**
   * Get basic organization list for API responses.
   * Used by ApiListOrganizationsController.
   */
  async getBasicList(): Promise<
    Array<{
      id: DatabaseId
      name: string
      description?: string | null
      logo?: string | null
      website?: string | null
      plan?: string | null
    }>
  > {
    const organizations = await Organization.query()
      .whereNull('deleted_at')
      .orderBy('id', 'asc')
      .select('id', 'name', 'description', 'logo', 'website', 'plan')

    return organizations.map((org) => org.serialize()) as Array<{
      id: DatabaseId
      name: string
      description?: string | null
      logo?: string | null
      website?: string | null
      plan?: string | null
    }>
  }
}
