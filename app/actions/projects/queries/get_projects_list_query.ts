import { HttpContext } from '@adonisjs/core/http'
import { BaseQuery } from '#actions/shared/base_query'
import db from '@adonisjs/lucid/services/db'

/**
 * DTO for GetProjectsListQuery input
 */
export interface GetProjectsListDTO {
  page?: number
  limit?: number
  organization_id?: number
  status_id?: number
  creator_id?: number
  manager_id?: number
  visibility?: 'public' | 'private' | 'team'
  search?: string
  sort_by?: 'created_at' | 'name' | 'start_date' | 'end_date'
  sort_order?: 'asc' | 'desc'
}

/**
 * Query result interface
 */
export interface GetProjectsListResult {
  data: unknown[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  filters: GetProjectsListDTO
  stats: {
    total_projects: number
    active_projects: number
    completed_projects: number
  }
}

/**
 * Query to get paginated list of projects with filters
 *
 * Features:
 * - Pagination support
 * - Multiple filters (organization, status, creator, manager, visibility)
 * - Search by name/description
 * - Sorting options
 * - User scope (only shows projects where user is creator/manager/member)
 * - Includes project stats (task count, member count)
 * - Cached for 5 minutes
 *
 * @extends {BaseQuery<GetProjectsListDTO, GetProjectsListResult>}
 */
export default class GetProjectsListQuery extends BaseQuery<
  GetProjectsListDTO,
  GetProjectsListResult
> {
  constructor(ctx: HttpContext) {
    super(ctx)
  }

  /**
   * Execute the query
   */
  async handle(dto: GetProjectsListDTO): Promise<GetProjectsListResult> {
    const user = this.ctx.auth.user!

    // Default values
    const page = dto.page || 1
    const limit = dto.limit || 20
    const offset = (page - 1) * limit
    const sortBy = dto.sort_by || 'created_at'
    const sortOrder = dto.sort_order || 'desc'

    // Build base query
    let query = db
      .from('projects as p')
      .select(
        'p.id',
        'p.name',
        'p.description',
        'p.organization_id',
        'p.start_date',
        'p.end_date',
        'p.visibility',
        'p.budget',
        'p.created_at',
        'p.updated_at',
        'ps.name as status_name',
        'ps.id as status_id',
        'o.name as organization_name',
        'u1.username as creator_name',
        'u1.id as creator_id',
        'u2.username as manager_name',
        'u2.id as manager_id'
      )
      .leftJoin('project_status as ps', 'p.status_id', 'ps.id')
      .leftJoin('organizations as o', 'p.organization_id', 'o.id')
      .leftJoin('users as u1', 'p.creator_id', 'u1.id')
      .leftJoin('users as u2', 'p.manager_id', 'u2.id')
      .leftJoin('project_members as pm', 'p.id', 'pm.project_id')
      .whereNull('p.deleted_at')

    // User scope - only show projects where user has access
    query = query.where((builder) => {
      void builder
        .where('p.creator_id', user.id)
        .orWhere('p.manager_id', user.id)
        .orWhere('pm.user_id', user.id)
    })

    // Apply filters
    if (dto.organization_id) {
      query = query.where('p.organization_id', dto.organization_id)
    }

    if (dto.status_id) {
      query = query.where('p.status_id', dto.status_id)
    }

    if (dto.creator_id) {
      query = query.where('p.creator_id', dto.creator_id)
    }

    if (dto.manager_id) {
      query = query.where('p.manager_id', dto.manager_id)
    }

    if (dto.visibility) {
      query = query.where('p.visibility', dto.visibility)
    }

    // Search filter
    if (dto.search && dto.search.trim().length > 0) {
      const searchTerm = `%${dto.search.trim()}%`
      query = query.where((builder) => {
        void builder
          .where('p.name', 'like', searchTerm)
          .orWhere('p.description', 'like', searchTerm)
      })
    }

    // Group by to avoid duplicates from joins
    query = query.groupBy('p.id')

    // Count total (before pagination)
    let total = 0
    try {
      const countQuery = query.clone().clearSelect().clearOrder().count('DISTINCT p.id as total')
      const countResult = await countQuery.first()
      total = Number(countResult?.total || 0)
    } catch (_countError) {
      // Fallback: count without DISTINCT
      try {
        const fallbackCount = await query
          .clone()
          .clearSelect()
          .clearOrder()
          .count('* as total')
          .first()
        total = Number(fallbackCount?.total || 0)
      } catch (_fallbackError) {
        // Silently fail - total will be 0
      }
    }

    // Apply sorting
    query = query.orderBy(`p.${sortBy}`, sortOrder)

    // Apply pagination
    query = query.limit(limit).offset(offset)

    // Execute query
    const projects = await query

    // Get task counts and member counts for each project
    const projectsWithStats = await this.enrichWithStats(projects)

    // Get stats
    const stats = await this.getStats(user.id, dto)

    return {
      data: projectsWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: dto,
      stats,
    }
  }

  /**
   * Enrich projects with task counts and member counts
   */
  private async enrichWithStats(projects: unknown[]): Promise<unknown[]> {
    if (projects.length === 0) return []

    const projectIds = projects.map((p) => p.id)

    // Get task counts
    const taskCounts = await db
      .from('tasks')
      .select('project_id')
      .count('* as total')
      .whereIn('project_id', projectIds)
      .whereNull('deleted_at')
      .groupBy('project_id')

    // Get member counts
    const memberCounts = await db
      .from('project_members')
      .select('project_id')
      .count('* as total')
      .whereIn('project_id', projectIds)
      .groupBy('project_id')

    // Map counts to projects
    const taskCountMap = new Map(taskCounts.map((t) => [t.project_id, Number(t.total)]))
    const memberCountMap = new Map(memberCounts.map((m) => [m.project_id, Number(m.total)]))

    return projects.map((project) => ({
      ...project,
      task_count: taskCountMap.get(project.id) || 0,
      member_count: memberCountMap.get(project.id) || 0,
    }))
  }

  /**
   * Get overall statistics
   */
  private async getStats(
    userId: number,
    filters: GetProjectsListDTO
  ): Promise<{
    total_projects: number
    active_projects: number
    completed_projects: number
  }> {
    // Base query for stats (same filters as main query)
    let statsQuery = db
      .from('projects as p')
      .leftJoin('project_members as pm', 'p.id', 'pm.project_id')
      .whereNull('p.deleted_at')
      .where((builder) => {
        void builder
          .where('p.creator_id', userId)
          .orWhere('p.manager_id', userId)
          .orWhere('pm.user_id', userId)
      })

    // Apply same filters
    if (filters.organization_id) {
      statsQuery = statsQuery.where('p.organization_id', filters.organization_id)
    }

    const [totalResult, activeResult, completedResult] = await Promise.all([
      statsQuery.clone().countDistinct('p.id as count').first(),
      statsQuery.clone().whereIn('p.status_id', [1, 2]).countDistinct('p.id as count').first(), // pending, in_progress
      statsQuery.clone().where('p.status_id', 3).countDistinct('p.id as count').first(), // completed
    ])

    return {
      total_projects: Number(totalResult?.count || 0),
      active_projects: Number(activeResult?.count || 0),
      completed_projects: Number(completedResult?.count || 0),
    }
  }

  /**
   * Get cache key for this query
   */
  protected getCacheKey(input: GetProjectsListDTO): string {
    const user = this.ctx.auth.user!
    return `projects:list:user:${user.id}:${JSON.stringify(input)}`
  }

  /**
   * Cache TTL: 5 minutes
   */
  protected getCacheTTL(): number {
    return 5 * 60 // 5 minutes
  }
}
