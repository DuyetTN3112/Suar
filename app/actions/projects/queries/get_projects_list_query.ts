import { BaseQuery } from '#actions/shared/base_query'
import { PAGINATION } from '#constants/common_constants'
import type { ProjectVisibility } from '#constants/project_constants'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import ProjectMemberRepository from '#infra/projects/repositories/project_member_repository'
import ProjectRepository from '#infra/projects/repositories/project_repository'
import type { DatabaseId } from '#types/database'

import { DefaultProjectDependencies } from '../ports/project_external_dependencies_impl.js'

/**
 * DTO for GetProjectsListQuery input
 */
export interface GetProjectsListDTO {
  page?: number
  limit?: number
  organization_id?: DatabaseId
  status?: string
  creator_id?: DatabaseId
  manager_id?: DatabaseId
  visibility?: ProjectVisibility
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
/**
 * Project row interface for query results
 */
interface ProjectRow {
  id: DatabaseId
  name: string
  description: string | null
  organization_id: DatabaseId | null
  start_date: Date | null
  end_date: Date | null
  visibility: string | null
  budget: number | null
  created_at: Date
  updated_at: Date
  status_name: string | null
  status: string | null
  organization_name: string | null
  creator_name: string | null
  creator_id: DatabaseId | null
  manager_name: string | null
  manager_id: DatabaseId | null
}

export default class GetProjectsListQuery extends BaseQuery<
  GetProjectsListDTO,
  GetProjectsListResult
> {
  /**
   * Execute the query
   */
  async handle(dto: GetProjectsListDTO): Promise<GetProjectsListResult> {
    const userId = this.getCurrentUserId()
    if (!userId) {
      throw new UnauthorizedException('User not authenticated')
    }

    const page = dto.page ?? 1
    const limit = dto.limit ?? PAGINATION.DEFAULT_PER_PAGE

    // 1. Paginate projects → delegate to Project model
    const { data: projects, total } = await ProjectRepository.paginateByUserAccess(userId, {
      page,
      limit,
      organization_id: dto.organization_id,
      status: dto.status,
      creator_id: dto.creator_id,
      manager_id: dto.manager_id,
      visibility: dto.visibility,
      search: dto.search,
      sort_by: dto.sort_by,
      sort_order: dto.sort_order,
    })

    // 2. Enrich with stats → delegate to Models
    const projectsWithStats = await this.enrichWithStats(projects as unknown as ProjectRow[])

    // 3. Get stats → delegate to Project model
    const stats = await ProjectRepository.getStatsByUserAccess(userId, {
      organization_id: dto.organization_id,
    })

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
   * Enrich projects with task counts and member counts → delegate to Model
   */
  private async enrichWithStats(
    projects: ProjectRow[]
  ): Promise<(ProjectRow & { task_count: number; member_count: number })[]> {
    if (projects.length === 0) return []

    const projectIds = projects.map((p) => p.id)

    // Get task counts and member counts in parallel → delegate to Model
    const [taskCountMap, memberCountMap] = await Promise.all([
      DefaultProjectDependencies.task.countByProjectIds(projectIds),
      ProjectMemberRepository.countByProjectIds(projectIds),
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
}
