
import type { GetOrganizationsListDTO } from '../../dtos/request/directory/get_organizations_list_dto.js'

import {
  CACHE_COLLECTION_GENERATION_NAMESPACES,
  entityCacheGenerationNamespaces,
} from '#modules/cache/public_contracts/cache_contract'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type {
  OrganizationBasicRecord,
  OrganizationMembershipRepository,
  OrganizationReader,
} from '#modules/organizations/actions/ports/outbound/directory/organization_persistence'
import type { OrganizationPortfolioStatsReader } from '#modules/organizations/actions/ports/outbound/directory/organization_portfolio_stats_reader'

type OptionalPayloadKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

type OmittedUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalPayloadKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalPayloadKeys<T>]?: Exclude<T[Key], undefined>
}

function omitUndefined<T extends object>(value: T): OmittedUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmittedUndefined<T>
}



interface OrganizationWithStats extends OrganizationBasicRecord {
  member_count: number
  project_count: number
}

interface PaginatedResult {
  data: OrganizationWithStats[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

/**
 * Query: Get Organizations List
 *
 * Pattern: Paginated query with Redis caching (learned from Projects module)
 * Features:
 * - User scope filtering (only user's organizations)
 * - Search by name/description
 * - Sorting support
 * - Redis caching (5 min TTL)
 * - Enriched with stats (member_count, project_count)
 *
 * @example
 * const query = new GetOrganizationsListQuery(ctx)
 * const result = await query.execute(dto)
 */
export default class GetOrganizationsListQuery {
  constructor(
    protected execCtx: OrganizationActionContext,
    private readonly portfolioStats: OrganizationPortfolioStatsReader,
    private readonly organizations: OrganizationReader,
    private readonly memberships: OrganizationMembershipRepository
  ) {}

  /**
   * Execute query: Get organizations list
   */
  async execute(dto: GetOrganizationsListDTO): Promise<PaginatedResult> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException('Unauthorized')
    }

    // 1. Try cache first
    const logicalCacheKey = dto.getCacheKey(userId)
    const cacheKey = await cacheStore.resolveVersionedKeyBestEffort(
      entityCacheGenerationNamespaces(
        CACHE_COLLECTION_GENERATION_NAMESPACES.organizationList,
        'user',
        userId
      ),
      logicalCacheKey
    )
    const cached = cacheKey ? await cacheStore.get<PaginatedResult>(cacheKey) : null
    if (cached) {
      return cached
    }

    // 2. Paginate organizations → delegate to Model
    const { column, direction } = dto.getOrderByClause()
    const { data: organizations, total } = await this.organizations.paginateByUser(userId, omitUndefined({
      page: dto.page,
      limit: dto.limit,
      search: dto.hasSearch() ? (dto.getNormalizedSearch() ?? undefined) : undefined,
      sortColumn: column,
      sortDirection: direction,
      plan: dto.plan,
      partnerType: dto.partnerType,
      partnerIsActive: dto.partnerIsActive,
      createdAtStart: dto.createdAtStart,
      createdAtEnd: dto.createdAtEnd,
    }))

    // 3. Enrich with stats
    const enrichedOrganizations = await this.enrichWithStats(organizations)

    // 4. Build pagination metadata
    const pagination = dto.getPaginationMetadata(total)

    const result: PaginatedResult = {
      data: enrichedOrganizations,
      pagination,
    }

    // 5. Cache result (5 minutes)
    if (cacheKey) {
      await cacheStore.setBestEffort(cacheKey, result, 300)
    }

    return result
  }

  /**
   * Helper: Enrich organizations with stats
   * Pattern: Parallel stat fetching via Model batch methods
   */
  private async enrichWithStats(
    organizations: OrganizationBasicRecord[]
  ): Promise<OrganizationWithStats[]> {
    if (organizations.length === 0) return []

    const orgIds = organizations.map((org) => org.id)

    // Fetch stats in parallel using model methods
    const [memberCountMap, projectCountMap] = await Promise.all([
      this.memberships.countMembersByOrganizationIds(orgIds),
      this.portfolioStats.countNonDeletedProjectsByOrganizationIds(orgIds),
    ])

    // Enrich organizations
    return organizations.map((org) => ({
      ...org,
      member_count: memberCountMap.get(org.id) ?? 0,
      project_count: projectCountMap.get(org.id) ?? 0,
    }))
  }
}
