import { BaseQuery } from '#actions/shared/base_query'
import ProjectMember from '#models/project_member'
import Task from '#models/task'
import AuditLog from '#models/audit_log'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import ForbiddenException from '#exceptions/forbidden_exception'
import { PAGINATION } from '#constants/common_constants'

/**
 * DTO for GetProjectMembersQuery input
 */
export interface GetProjectMembersDTO {
  project_id: DatabaseId
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
    user_id: DatabaseId
    username: string
    email: string
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
/**
 * Member row interface for query results
 */
interface MemberRow {
  user_id: DatabaseId
  role: string
  joined_at: Date
  username: string
  email: string
}

export default class GetProjectMembersQuery extends BaseQuery<
  GetProjectMembersDTO,
  GetProjectMembersResult
> {
  /**
   * Execute the query
   */
  async handle(dto: GetProjectMembersDTO): Promise<GetProjectMembersResult> {
    // Validate user has access to this project
    await this.validateAccess(dto.project_id)

    // Default values
    const page = dto.page || 1
    const limit = dto.limit || PAGINATION.DEFAULT_PER_PAGE

    // Get members → delegate to Model
    const { data: members, total } = await ProjectMember.getMembersWithDetails(dto.project_id, {
      page,
      limit,
      role: dto.role,
      search: dto.search,
    })

    // Enrich with task counts and last activity
    const enrichedMembers = await this.enrichMembers(members as MemberRow[], dto.project_id)

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
   * Validate user has access to view project members → delegate to Model
   */
  private async validateAccess(projectId: DatabaseId): Promise<void> {
    const userId = this.getCurrentUserId()
    if (!userId) {
      throw new UnauthorizedException()
    }

    const hasAccess = await ProjectMember.hasAccess(projectId, userId)
    if (!hasAccess) {
      throw new ForbiddenException('Bạn không có quyền xem danh sách thành viên của dự án này')
    }
  }

  /**
   * Enrich members with task counts and last activity → delegate to Model
   */
  private async enrichMembers(
    members: MemberRow[],
    projectId: DatabaseId
  ): Promise<GetProjectMembersResult['data']> {
    if (members.length === 0) return []

    const userIds = members.map((m) => m.user_id)

    // Get task counts and last activity in parallel → delegate to Model
    const [taskCountMap, lastActivityMap] = await Promise.all([
      Task.countByAssignees(projectId, userIds),
      AuditLog.getLastActivityByUsers('project', projectId, userIds),
    ])

    // Enrich members
    return members.map((member) => ({
      ...member,
      task_count: taskCountMap.get(String(member.user_id)) ?? 0,
      last_active_at: lastActivityMap.get(String(member.user_id)) ?? null,
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
