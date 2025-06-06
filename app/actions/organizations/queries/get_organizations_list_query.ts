import type { ExecutionContext } from '#types/execution_context'
import OrganizationRepository from '#repositories/organization_repository'
import redis from '@adonisjs/redis/services/main'
import OrganizationUserRepository from '#repositories/organization_user_repository'
import ProjectRepository from '#repositories/project_repository'
import type { GetOrganizationsListDTO } from '../dtos/get_organizations_list_dto.js'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'

interface OrganizationRecord {
  id: DatabaseId
  name: string
  slug: string
  description: string | null
  logo: string | null
  website: string | null
  plan: string
  owner_id: DatabaseId
  created_at: Date
  updated_at: Date
}

interface OrganizationWithStats extends OrganizationRecord {
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
 * - Filter by plan
 * - Sorting support
 * - Redis caching (5 min TTL)
 * - Enriched with stats (member_count, project_count)
 *
 * @example
 * const query = new GetOrganizationsListQuery(ctx)
 * const result = await query.execute(dto)
 */
export default class GetOrganizationsListQuery {
  constructor(protected execCtx: ExecutionContext) {}

  /**
   * Execute query: Get organizations list
   */
  async execute(dto: GetOrganizationsListDTO): Promise<PaginatedResult> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException('Unauthorized')
    }

    // 1. Try cache first
    const cacheKey = dto.getCacheKey(userId)
    const cached = await redis.get(cacheKey)
    if (cached) {
      return JSON.parse(cached) as PaginatedResult
    }

    // 2. Paginate organizations → delegate to Model
    const { column, direction } = dto.getOrderByClause()
    const { data: organizations, total } = await OrganizationRepository.paginateByUser(userId, {
      page: dto.page,
      limit: dto.limit,
      search: dto.hasSearch() ? (dto.getNormalizedSearch() ?? undefined) : undefined,
      plan: dto.hasPlanFilter() ? (dto.getNormalizedPlan() ?? undefined) : undefined,
      sortColumn: column,
      sortDirection: direction,
    })

    // 3. Enrich with stats
    const enrichedOrganizations = await this.enrichWithStats(organizations)

    // 4. Build pagination metadata
    const pagination = dto.getPaginationMetadata(total)

    const result: PaginatedResult = {
      data: enrichedOrganizations,
      pagination,
    }

    // 5. Cache result (5 minutes)
    await redis.setex(cacheKey, 300, JSON.stringify(result))

    return result
  }

  /**
   * Helper: Enrich organizations with stats
   * Pattern: Parallel stat fetching via Model batch methods
   */
  private async enrichWithStats(
    organizations: OrganizationRecord[]
  ): Promise<OrganizationWithStats[]> {
    if (organizations.length === 0) return []

    const orgIds = organizations.map((org) => org.id)

    // Fetch stats in parallel using model methods
    const [memberCountMap, projectCountMap] = await Promise.all([
      OrganizationUserRepository.countMembersByOrgIds(orgIds),
      ProjectRepository.countByOrgIds(orgIds),
    ])

    // Enrich organizations
    return organizations.map((org) => ({
      ...org,
      member_count: memberCountMap.get(String(org.id)) ?? 0,
      project_count: projectCountMap.get(String(org.id)) ?? 0,
    }))
  }
}
