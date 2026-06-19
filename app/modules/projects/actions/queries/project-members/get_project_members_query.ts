import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import {
  buildPaginationMeta,
  normalizePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'
import { BaseQuery } from '#modules/projects/actions/base_query'
import { PROJECT_PAGINATION as PAGINATION } from '#modules/projects/actions/dtos/common/project_pagination'
import type { ProjectAuditActivityReader } from '#modules/projects/actions/ports/outbound/project_audit_activity_reader'
import type { ProjectMembershipRepository } from '#modules/projects/actions/ports/outbound/project_membership_repository'
import type { ProjectTaskStatsReader } from '#modules/projects/actions/ports/outbound/project_task_stats_reader'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import { canViewProjectMembers } from '#modules/projects/domain/project-members/project_permission_policy'

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
    project_professional_role_id: string | null
    professional_role_name: string | null
    professional_role_code: string | null
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
  project_professional_role_id: string | null
  professional_role_name: string | null
  professional_role_code: string | null
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
    private readonly auditActivityReader: ProjectAuditActivityReader,
    private readonly taskStatsReader: ProjectTaskStatsReader,
    private readonly memberships: ProjectMembershipRepository
  ) {
    super(execCtx)
  }

  /**
   * Execute the query
   */
  async handle(dto: GetProjectMembersDTO): Promise<GetProjectMembersResult> {
    // Validate user has access to this project
    await this.validateAccess(dto.project_id)

    const pagination = normalizePagination(
      {
        page: dto.page,
        limit: dto.limit,
      },
      PAGINATION
    )

    // Get members → delegate to Model
    const { data: members, total } = await this.memberships.listMembers(
      dto.project_id,
      omitUndefined({
        page: pagination.page,
        limit: pagination.perPage,
        role: dto.role,
        search: dto.search,
      })
    )

    // Enrich with task counts and last activity
    const enrichedMembers = await this.enrichMembers(members, dto.project_id)
    const meta = buildPaginationMeta(total, pagination)

    return {
      data: enrichedMembers,
      pagination: {
        page: meta.currentPage,
        limit: meta.perPage,
        total: meta.total,
        totalPages: meta.lastPage,
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

    const hasAccess = await this.memberships.hasAccess(projectId, userId)
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
      this.auditActivityReader.getLastProjectActivityByUsers(projectId, userIds),
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
