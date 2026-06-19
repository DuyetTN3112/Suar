import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import {
  buildPaginationMeta,
  normalizePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'
import { BaseQuery } from '#modules/projects/actions/base_query'
import { PROJECT_PAGINATION as PAGINATION } from '#modules/projects/actions/dtos/common/project_pagination'
import type {
  ProjectAccessListFilters,
  ProjectListRecord,
  ProjectListRepository,
} from '#modules/projects/actions/ports/outbound/project_list_repository'
import type { ProjectMembershipRepository } from '#modules/projects/actions/ports/outbound/project_membership_repository'
import type { ProjectSearchCandidateReader } from '#modules/projects/actions/ports/outbound/project_search_candidate_reader'
import type { ProjectTaskStatsReader } from '#modules/projects/actions/ports/outbound/project_task_stats_reader'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import type {
  GetProjectsListDTO,
  GetProjectsListResult,
} from '#modules/projects/public_contracts/project_listing'
import { searchFallbackObserver } from '#modules/search/public_contracts/search_fallback_observer'

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
 * DTO for GetProjectsListQuery input
 */
export type { GetProjectsListDTO, GetProjectsListResult }

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
/**
 * Project row interface for query results
 */
export default class GetProjectsListQuery extends BaseQuery<
  GetProjectsListDTO,
  GetProjectsListResult
> {
  constructor(
    execCtx: ProjectActionContext,
    private readonly taskStatsReader: ProjectTaskStatsReader,
    private readonly projects: ProjectListRepository,
    private readonly memberships: ProjectMembershipRepository,
    private readonly searchCandidateReader: ProjectSearchCandidateReader
  ) {
    super(execCtx)
  }

  /**
   * Execute the query
   */
  async handle(dto: GetProjectsListDTO): Promise<GetProjectsListResult> {
    const userId = this.getCurrentUserId()
    if (!userId) {
      throw new UnauthorizedException('User not authenticated')
    }

    const pagination = normalizePagination(
      {
        page: dto.page,
        limit: dto.limit,
      },
      PAGINATION
    )
    const projectIds = await this.resolveSearchProjectIds(dto, pagination.page, pagination.perPage)

    // 1. Paginate projects → delegate to Project model
    const accessFilters: ProjectAccessListFilters = omitUndefined({
      page: pagination.page,
      limit: pagination.perPage,
      project_ids: projectIds ?? undefined,
      organization_id: dto.organization_id,
      status: dto.status,
      creator_id: dto.creator_id,
      manager_id: dto.manager_id,
      visibility: dto.visibility,
      search: projectIds ? undefined : dto.search,
      sort_by: dto.sort_by,
      sort_order: dto.sort_order,
      allow_external_contributors: dto.allow_external_contributors,
      start_date_start: dto.start_date_start,
      start_date_end: dto.start_date_end,
      end_date_start: dto.end_date_start,
      end_date_end: dto.end_date_end,
      created_at_start: dto.created_at_start,
      created_at_end: dto.created_at_end,
    })
    const { data: projects, total } = await this.projects.paginateByUserAccess(
      userId,
      accessFilters
    )

    // 2. Enrich with stats → delegate to Models
    const projectsWithStats = await this.enrichWithStats(projects)

    // 3. Get stats → delegate to Project model
    const stats = await this.projects.getStatsByUserAccess(
      userId,
      omitUndefined({
        organization_id: dto.organization_id,
      })
    )
    const meta = buildPaginationMeta(total, pagination)

    return {
      data: projectsWithStats,
      pagination: {
        page: meta.currentPage,
        limit: meta.perPage,
        total: meta.total,
        totalPages: meta.lastPage,
      },
      filters: dto,
      stats,
    }
  }

  /**
   * Enrich projects with task counts and member counts → delegate to Model
   */
  private async enrichWithStats(
    projects: ProjectListRecord[]
  ): Promise<(ProjectListRecord & { task_count: number; member_count: number })[]> {
    if (projects.length === 0) return []

    const projectIds = projects.map((p) => p.id)

    // Get task counts and member counts in parallel → delegate to Model
    const [taskCountMap, memberCountMap] = await Promise.all([
      this.taskStatsReader.countTasksByProjectIds(projectIds),
      this.memberships.countByProjectIds(projectIds),
    ])

    return projects.map((project) => ({
      ...project,
      task_count: taskCountMap.get(project.id) ?? 0,
      member_count: memberCountMap.get(project.id) ?? 0,
    }))
  }

  /**
   * Get cache key for this query
   */
  protected getCacheKey(input: GetProjectsListDTO): string {
    const userId = this.getCurrentUserId() ?? 0
    return `projects:list:user:${userId}:${JSON.stringify(input)}`
  }

  /**
   * Cache TTL: 5 minutes
   */
  protected getCacheTTL(): number {
    return 5 * 60 // 5 minutes
  }

  private async resolveSearchProjectIds(
    dto: GetProjectsListDTO,
    page: number,
    limit: number
  ): Promise<string[] | null> {
    if (!dto.search?.trim() || !this.searchCandidateReader.isEnabled()) {
      return null
    }

    try {
      const results = await this.searchCandidateReader.searchProjectCandidates({
        q: dto.search,
        limit: Math.max(page * limit, limit),
      })

      if (results.length === 0) {
        return null
      }

      return results.map((result) => result.projectId)
    } catch (error) {
      searchFallbackObserver.record({ surface: 'projects.list', error })
      return null
    }
  }
}
