import OrganizationRepository from '#infra/organizations/repositories/organization_repository'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import UserRepository from '#infra/users/repositories/user_repository'
import type { DatabaseId } from '#types/database'

interface EnhancedOrganization {
  id: DatabaseId
  name: string
  description?: string | null
  logo?: string | null
  website?: string | null
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
  /**
   * Get all organizations enhanced with owner names and member counts.
   * Used by ListOrganizationsController.
   */
  async getEnhanced(): Promise<EnhancedOrganization[]> {
    const allOrganizations = await OrganizationRepository.findAllActive()

    const orgIds = allOrganizations.map((org) => org.id)

    // Batch query: owner usernames
    const ownerIds = [...new Set(allOrganizations.map((org) => org.owner_id))]
    const owners = await UserRepository.findByIds(ownerIds, ['id', 'username'])
    const ownerMap = new Map(owners.map((o) => [o.id, o.username]))

    // Batch query: member counts
    const memberCountMap = await OrganizationUserRepository.countMembersByOrgIds(orgIds)

    return allOrganizations.map((org) => ({
      id: org.id,
      name: org.name,
      description: org.description,
      logo: org.logo,
      website: org.website,
      founded_date: '2023',
      owner: ownerMap.get(org.owner_id) ?? 'Admin',
      employee_count: memberCountMap.get(org.id) ?? 0,
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
    const organizations = await OrganizationRepository.findAllActive()

    const memberships = await OrganizationUserRepository.findMembershipsByUser(userId)

    return organizations.map((org) => {
      const membership = memberships.find((m) => m.organization_id === org.id)
      return {
        id: org.id,
        name: org.name,
        description: org.description,
        logo: org.logo,
        website: org.website,
        membership_status: membership ? membership.status : null,
      }
    })
  }

  /**
   * Get basic organization list for API responses.
   * Used by ApiListOrganizationsController.
   */
  async getBasicList(): Promise<
    {
      id: DatabaseId
      name: string
      description?: string | null
      logo?: string | null
      website?: string | null
    }[]
  > {
    const organizations = await OrganizationRepository.findAllActiveBasicList()

    return organizations.map((org) => ({
      id: org.id,
      name: org.name,
      description: org.description,
      logo: org.logo,
      website: org.website,
    }))
  }
}
