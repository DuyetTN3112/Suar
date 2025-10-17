import { DefaultOrganizationDependencies } from '../ports/organization_external_dependencies_impl.js'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import type { OrganizationSearchCandidateReader } from '#modules/organizations/actions/ports/organization_search_candidate_reader'
import { EngineOrganizationSearchCandidateReader } from '#modules/organizations/infra/adapters/engine_organization_search_candidate_reader'
import * as listingQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/listing_queries'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import OrganizationRepository from '#modules/organizations/infra/repositories/read/organization_repository'
import { buildPaginationMeta, toWindowLimit } from '#modules/pagination/public_contracts/pagination_public_api'
import { isSearchRuntimeEnabled } from '#modules/search/public_contracts/search_engine'


interface EnhancedOrganization {
  id: string
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
  id: string
  name: string
  membership_status: string | null
  [key: string]: unknown
}

interface PaginatedOrganizationsWithMembership {
  data: AllOrganizationsWithMembership[]
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
  }
}

interface GetAllOrganizationsQueryDeps {
  searchCandidateReader: OrganizationSearchCandidateReader
  findAllActive: typeof OrganizationRepository.findAllActive
  findAllActiveBasicList: typeof OrganizationRepository.findAllActiveBasicList
  findActiveBasicListByIds: typeof OrganizationRepository.findActiveBasicListByIds
  paginateActiveBasicList: typeof OrganizationRepository.paginateActiveBasicList
  searchActiveBasicList: typeof OrganizationRepository.searchActiveBasicList
  findMembershipsByUser: typeof membershipQueries.findMembershipsByUser
  countMembersByOrgIds: typeof listingQueries.countMembersByOrgIds
  findOwnerNamesByIds: typeof DefaultOrganizationDependencies.user.findOwnerNamesByIds
}

/**
 * Query: Get All Organizations
 *
 * Loads all active organizations with various data shapes
 * depending on the caller's needs.
 */
export default class GetAllOrganizationsQuery {
  constructor(
    private readonly deps: GetAllOrganizationsQueryDeps = {
      searchCandidateReader: new EngineOrganizationSearchCandidateReader(),
      findAllActive: (...args) => OrganizationRepository.findAllActive(...args),
      findAllActiveBasicList: (...args) => OrganizationRepository.findAllActiveBasicList(...args),
      findActiveBasicListByIds: (...args) => OrganizationRepository.findActiveBasicListByIds(...args),
      paginateActiveBasicList: (...args) => OrganizationRepository.paginateActiveBasicList(...args),
      searchActiveBasicList: (...args) => OrganizationRepository.searchActiveBasicList(...args),
      findMembershipsByUser: membershipQueries.findMembershipsByUser,
      countMembersByOrgIds: listingQueries.countMembersByOrgIds,
      findOwnerNamesByIds: DefaultOrganizationDependencies.user.findOwnerNamesByIds.bind(
        DefaultOrganizationDependencies.user
      ),
    }
  ) {}

  /**
   * Get all organizations enhanced with owner names and member counts.
   * Used by ListOrganizationsController.
   */
  async getEnhanced(): Promise<EnhancedOrganization[]> {
    const allOrganizations = await this.deps.findAllActive()

    const orgIds = allOrganizations.map((org) => org.id)

    // Batch query: owner usernames
    const ownerIds = [...new Set(allOrganizations.map((org) => org.owner_id))]
    const owners = await this.deps.findOwnerNamesByIds(ownerIds)
    const ownerMap = new Map(owners.map((o) => [o.id, o.username]))

    // Batch query: member counts
    const memberCountMap = await this.deps.countMembersByOrgIds(orgIds)

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
  async getWithMembershipStatus(userId: string): Promise<AllOrganizationsWithMembership[]> {
    const organizations = await this.deps.findAllActive()

    const memberships = await this.deps.findMembershipsByUser(userId)

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

  async getWithMembershipStatusPage(input: {
    userId: string
    page: number
    perPage: number
    search?: string
    plan?: string
    partnerType?: string
    partnerIsActive?: boolean
    createdAtStart?: string
    createdAtEnd?: string
  }): Promise<PaginatedOrganizationsWithMembership> {
    const organizationIds = await this.resolveEngineOrganizationIds(
      input.search,
      input.page,
      input.perPage
    )
    const result = await this.deps.paginateActiveBasicList(omitUndefined({
      page: input.page,
      perPage: input.perPage,
      search: organizationIds ? undefined : input.search,
      organizationIds: organizationIds ?? undefined,
      plan: input.plan,
      partnerType: input.partnerType,
      partnerIsActive: input.partnerIsActive,
      createdAtStart: input.createdAtStart,
      createdAtEnd: input.createdAtEnd,
    }))
    const memberships = await this.deps.findMembershipsByUser(input.userId)
    const membershipMap = new Map(memberships.map((membership) => [membership.organization_id, membership.status]))
    const meta = buildPaginationMeta(result.total, {
      page: input.page,
      perPage: input.perPage,
    })

    return {
      data: result.organizations.map((organization) => ({
        id: organization.id,
        name: organization.name,
        description: organization.description,
        logo: organization.logo,
        website: organization.website,
        membership_status: membershipMap.get(organization.id) ?? null,
      })),
      meta: {
        total: meta.total,
        perPage: meta.perPage,
        currentPage: meta.currentPage,
        lastPage: meta.lastPage,
      },
    }
  }

  /**
   * Get basic organization list for API responses.
   * Used by ApiListOrganizationsController.
   */
  async getBasicList(): Promise<
    {
      id: string
      name: string
      description?: string | null
      logo?: string | null
      website?: string | null
    }[]
  > {
    const organizations = await this.deps.findAllActiveBasicList()

    return organizations.map((org) => ({
      id: org.id,
      name: org.name,
      description: org.description,
      logo: org.logo,
      website: org.website,
    }))
  }

  async searchBasicList(
    rawQuery: string,
    limit = 25
  ): Promise<
    {
      id: string
      name: string
      description?: string | null
      logo?: string | null
      website?: string | null
    }[]
  > {
    const query = rawQuery.trim()
    if (!query) {
      return this.getBasicList()
    }

    if (isSearchRuntimeEnabled()) {
      try {
        const hits = await this.deps.searchCandidateReader.searchOrganizationCandidates({
          q: query,
          limit,
        })

        if (hits.length > 0) {
          const ids = hits.map((hit) => hit.organizationId)
          const organizations = await this.deps.findActiveBasicListByIds(ids)

          if (organizations.length > 0) {
            const order = new Map(ids.map((id, index) => [id, index]))
            return organizations
              .sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0))
              .map((org) => ({
                id: org.id,
                name: org.name,
                description: org.description,
                logo: org.logo,
                website: org.website,
              }))
          }
        }
      } catch {
        // Fall back to database keyword search when engine is unavailable.
      }
    }

    const organizations = await this.deps.searchActiveBasicList(query, limit)
    return organizations.map((org) => ({
      id: org.id,
      name: org.name,
      description: org.description,
      logo: org.logo,
      website: org.website,
    }))
  }

  private async resolveEngineOrganizationIds(
    rawQuery: string | undefined,
    page: number,
    perPage: number
  ): Promise<string[] | null> {
    const query = rawQuery?.trim()
    if (!query || !isSearchRuntimeEnabled()) {
      return null
    }

    try {
      const hits = await this.deps.searchCandidateReader.searchOrganizationCandidates({
        q: query,
        limit: toWindowLimit(page, perPage),
      })

      if (hits.length === 0) {
        return null
      }

      return hits.map((hit) => hit.organizationId)
    } catch {
      return null
    }
  }
}
