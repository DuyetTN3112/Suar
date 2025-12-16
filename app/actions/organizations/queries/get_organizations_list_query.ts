import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import redis from '@adonisjs/redis/services/main'
import type { GetOrganizationsListDTO } from '../dtos/get_organizations_list_dto.js'

interface OrganizationRecord {
  id: number
  name: string
  slug: string
  description: string | null
  logo: string | null
  website: string | null
  plan: string
  owner_id: number
  created_at: Date
  updated_at: Date
}

interface CountRecord {
  total: number | string
}

interface StatsRecord {
  organization_id: number
  count: number | string
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
  constructor(protected ctx: HttpContext) {}

  /**
   * Execute query: Get organizations list
   */
  async execute(dto: GetOrganizationsListDTO): Promise<PaginatedResult> {
    const user = this.ctx.auth.user
    if (!user) {
      throw new Error('Unauthorized')
    }

    // 1. Try cache first
    const cacheKey = dto.getCacheKey(user.id)
    const cached = await redis.get(cacheKey)
    if (cached) {
      return JSON.parse(cached) as PaginatedResult
    }

    // 2. Build query with filters
    const query = this.buildQuery(dto, user.id)

    // 3. Count total for pagination
    const countQuery = query.clone().clearSelect().count('* as total')
    const countResult = (await countQuery.first()) as CountRecord | null
    const total = Number(countResult?.total ?? 0)

    // 4. Execute data query with pagination
    const { column, direction } = dto.getOrderByClause()
    const organizations = (await query
      .select(
        'o.id',
        'o.name',
        'o.slug',
        'o.description',
        'o.logo',
        'o.website',
        'o.plan',
        'o.owner_id',
        'o.created_at',
        'o.updated_at'
      )
      .orderBy(column, direction)
      .limit(dto.limit)
      .offset(dto.getOffset())) as OrganizationRecord[]

    // 5. Enrich with stats
    const enrichedOrganizations = await this.enrichWithStats(organizations)

    // 6. Build pagination metadata
    const pagination = dto.getPaginationMetadata(total)

    const result: PaginatedResult = {
      data: enrichedOrganizations,
      pagination,
    }

    // 7. Cache result (5 minutes)
    await redis.setex(cacheKey, 300, JSON.stringify(result))

    return result
  }

  /**
   * Helper: Build query with filters
   */
  private buildQuery(dto: GetOrganizationsListDTO, userId: number) {
    const query = db
      .from('organizations as o')
      .join('organization_users as ou', 'o.id', 'ou.organization_id')
      .where('ou.user_id', userId)
      .whereNull('o.deleted_at')

    // Search filter
    if (dto.hasSearch()) {
      const search = dto.getNormalizedSearch() ?? ''
      void query.where((builder) => {
        void builder
          .where('o.name', 'like', `%${search}%`)
          .orWhere('o.description', 'like', `%${search}%`)
      })
    }

    // Plan filter
    if (dto.hasPlanFilter()) {
      void query.where('o.plan', dto.getNormalizedPlan() ?? '')
    }

    return query
  }

  /**
   * Helper: Enrich organizations with stats
   * Pattern: Parallel stat fetching (learned from Projects module)
   */
  private async enrichWithStats(
    organizations: OrganizationRecord[]
  ): Promise<OrganizationWithStats[]> {
    if (organizations.length === 0) return []

    const orgIds = organizations.map((org) => org.id)

    // Fetch stats in parallel
    const [memberCounts, projectCounts] = (await Promise.all([
      // Member counts
      db
        .from('organization_users')
        .whereIn('organization_id', orgIds)
        .groupBy('organization_id')
        .select('organization_id')
        .count('* as count'),
      // Project counts
      db
        .from('projects')
        .whereIn('organization_id', orgIds)
        .whereNull('deleted_at')
        .groupBy('organization_id')
        .select('organization_id')
        .count('* as count'),
    ])) as [StatsRecord[], StatsRecord[]]

    // Create lookup maps
    const memberCountMap = new Map(memberCounts.map((m) => [m.organization_id, Number(m.count)]))
    const projectCountMap = new Map(projectCounts.map((p) => [p.organization_id, Number(p.count)]))

    // Enrich organizations
    return organizations.map((org) => ({
      ...org,
      member_count: memberCountMap.get(org.id) ?? 0,
      project_count: projectCountMap.get(org.id) ?? 0,
    }))
  }
}
