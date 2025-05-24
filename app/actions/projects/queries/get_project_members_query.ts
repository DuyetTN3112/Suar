import { HttpContext } from '@adonisjs/core/http'
import { BaseQuery } from '#actions/shared/base_query'
import db from '@adonisjs/lucid/services/db'

/**
 * DTO for GetProjectMembersQuery input
 */
export interface GetProjectMembersDTO {
  project_id: number
  page?: number
  limit?: number
  role?: string
  search?: string
}

/**
 * Query result interface
 */
export interface GetProjectMembersResult {
  data: Array<{
    user_id: number
    full_name: string
    email: string
    avatar_url: string | null
    role: string
    joined_at: Date
    task_count: number
    last_active_at: Date | null
  }>
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * Query to get paginated list of project members
 *
 * Features:
 * - Pagination support
 * - Filter by role
 * - Search by name or email
 * - Includes task count per member
 * - Includes last activity timestamp
 * - Cached for 3 minutes
 *
 * @extends {BaseQuery<GetProjectMembersDTO, GetProjectMembersResult>}
 */
export default class GetProjectMembersQuery extends BaseQuery<
  GetProjectMembersDTO,
  GetProjectMembersResult
> {
  constructor(ctx: HttpContext) {
    super(ctx)
  }

  /**
   * Execute the query
   */
  async handle(dto: GetProjectMembersDTO): Promise<GetProjectMembersResult> {
    // Validate user has access to this project
    await this.validateAccess(dto.project_id)

    // Default values
    const page = dto.page || 1
    const limit = dto.limit || 20
    const offset = (page - 1) * limit

    // Build base query
    let query = db
      .from('project_members as pm')
      .select(
        'pm.user_id',
        'pm.role',
        'pm.created_at as joined_at',
        'u.full_name',
        'u.email',
        'ud.avatar_url'
      )
      .leftJoin('users as u', 'pm.user_id', 'u.id')
      .leftJoin('user_details as ud', 'u.id', 'ud.user_id')
      .where('pm.project_id', dto.project_id)

    // Apply role filter
    if (dto.role) {
      query = query.where('pm.role', dto.role)
    }

    // Apply search filter
    if (dto.search && dto.search.trim().length > 0) {
      const searchTerm = `%${dto.search.trim()}%`
      query = query.where((builder) => {
        builder.where('u.full_name', 'like', searchTerm).orWhere('u.email', 'like', searchTerm)
      })
    }

    // Count total (before pagination)
    const countQuery = query.clone().clearSelect().count('* as total')
    const countResult = await countQuery.first()
    const total = Number(countResult?.total || 0)

    // Apply pagination and sorting
    query = query.orderBy('pm.created_at', 'asc').limit(limit).offset(offset)

    // Execute query
    const members = await query

    // Enrich with task counts and last activity
    const enrichedMembers = await this.enrichMembers(members, dto.project_id)

    return {
      data: enrichedMembers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Validate user has access to view project members
   */
  private async validateAccess(projectId: number): Promise<void> {
    const user = this.ctx.auth.user!

    // Check if user is creator, manager, owner, or member
    const access = await db
      .from('projects as p')
      .leftJoin('project_members as pm', (join) => {
        join.on('p.id', 'pm.project_id').andOnVal('pm.user_id', user.id)
      })
      .where('p.id', projectId)
      .whereNull('p.deleted_at')
      .where((builder) => {
        builder
          .where('p.creator_id', user.id)
          .orWhere('p.manager_id', user.id)
          .orWhere('p.owner_id', user.id)
          .orWhereNotNull('pm.user_id')
      })
      .first()

    if (!access) {
      throw new Error('Bạn không có quyền xem danh sách thành viên của dự án này')
    }
  }

  /**
   * Enrich members with task counts and last activity
   */
  private async enrichMembers(members: any[], projectId: number): Promise<any[]> {
    if (members.length === 0) return []

    const userIds = members.map((m) => m.user_id)

    // Get task counts for each member
    const taskCounts = await db
      .from('tasks')
      .select('assigned_to as user_id')
      .count('* as count')
      .where('project_id', projectId)
      .whereIn('assigned_to', userIds)
      .whereNull('deleted_at')
      .groupBy('assigned_to')

    // Get last activity for each member (from audit logs)
    const lastActivities = await db
      .from('audit_logs')
      .select('user_id')
      .max('created_at as last_active')
      .where('entity_type', 'project')
      .where('entity_id', projectId)
      .whereIn('user_id', userIds)
      .groupBy('user_id')

    // Create maps for easy lookup
    const taskCountMap = new Map(taskCounts.map((t) => [t.user_id, Number(t.count)]))
    const lastActivityMap = new Map(lastActivities.map((a) => [a.user_id, a.last_active]))

    // Enrich members
    return members.map((member) => ({
      ...member,
      task_count: taskCountMap.get(member.user_id) || 0,
      last_active_at: lastActivityMap.get(member.user_id) || null,
    }))
  }

  /**
   * Get cache key for this query
   */
  protected getCacheKey(input: GetProjectMembersDTO): string {
    return `projects:members:${input.project_id}:${JSON.stringify(input)}`
  }

  /**
   * Cache TTL: 3 minutes
   */
  protected getCacheTTL(): number {
    return 3 * 60
  }
}
