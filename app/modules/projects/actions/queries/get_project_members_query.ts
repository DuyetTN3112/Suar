import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { BaseQuery } from '#modules/projects/actions/base_query'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import { PROJECT_PAGINATION as PAGINATION } from '#modules/projects/application/dtos/common/project_pagination'
import type { ProjectTaskStatsReader } from '#modules/projects/application/ports/project_task_stats_reader'
import { canViewProjectMembers } from '#modules/projects/domain/project_permission_policy'
import { TasksPublicApiProjectTaskStatsReader } from '#modules/projects/infra/adapters/tasks_public_api_project_task_stats_reader'
import ProjectMemberRepository from '#modules/projects/infra/repositories/project_member_repository'

/**
 * DTO for GetProjectMembersQuery input
 */
export interface GetProjectMembersDTO {
  project_id: string
  page?: number
  limit?: number
  role?: string
  search?: string
}

/**
 * Query result interface
 */
export interface GetProjectMembersResult {
  data: {
    user_id: string
    username: string
    email: string
    role: string
    joined_at: Date
    task_count: number
    last_active_at: Date | null
  }[]
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
  user_id: string
  role: string
  joined_at: Date
  username: string
  email: string
}

export default class GetProjectMembersQuery extends BaseQuery<
  GetProjectMembersDTO,
  GetProjectMembersResult
> {
  constructor(
    execCtx: ProjectActionContext,
    private readonly taskStatsReader: ProjectTaskStatsReader = new TasksPublicApiProjectTaskStatsReader()
  ) {
    super(execCtx)
  }

  /**
   * Execute the query
   */
  async handle(dto: GetProjectMembersDTO): Promise<GetProjectMembersResult> {
    // Validate user has access to this project
    await this.validateAccess(dto.project_id)

    // Default values
    const page = dto.page ?? 1
    const limit = dto.limit ?? PAGINATION.DEFAULT_PER_PAGE

    // Get members → delegate to Model
    const { data: members, total } = await ProjectMemberRepository.getMembersWithDetails(
      dto.project_id,
      {
        page,
        limit,
        role: dto.role,
        search: dto.search,
      }
    )

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
   * Validate user has access to view project members → delegate to Model
   */
  private async validateAccess(projectId: string): Promise<void> {
    const userId = this.getCurrentUserId()
    if (!userId) {
      throw new UnauthorizedException()
    }

    const hasAccess = await ProjectMemberRepository.hasAccess(projectId, userId)
    enforcePolicy(canViewProjectMembers({ hasProjectAccess: hasAccess }))
  }

  /**
   * Enrich members with task counts and last activity → delegate to Model
   */
  private async enrichMembers(
    members: MemberRow[],
    projectId: string
  ): Promise<GetProjectMembersResult['data']> {
    if (members.length === 0) return []

    const userIds = members.map((m) => m.user_id)

    // Get task counts and last activity in parallel → delegate to Model
    const [taskCountMap, lastActivityMap] = await Promise.all([
      this.taskStatsReader.countTasksByAssignees(projectId, userIds),
      auditPublicApi.getLastActivityByUsers('project', projectId, userIds),
    ])

    // Enrich members
    return members.map((member) => ({
      ...member,
      task_count: taskCountMap.get(member.user_id) ?? 0,
      last_active_at: lastActivityMap.get(member.user_id) ?? null,
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
