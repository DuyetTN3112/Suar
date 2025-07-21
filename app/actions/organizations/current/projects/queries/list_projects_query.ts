import { BaseQuery } from '#actions/organizations/base_query'
import OrganizationProjectRepository from '#infra/organizations/current/repositories/organization_project_repository'
import type { ExecutionContext } from '#types/execution_context'

/**
 * ListProjectsQuery
 *
 * Query to list organization projects with filtering and pagination.
 */

export interface ListProjectsDTO {
  page?: number
  perPage?: number
  search?: string
  status?: string
}

export interface ListProjectsResult {
  projects: {
    id: string
    name: string
    description: string | null
    status: string
    created_at: string
    _count: {
      members: number
      tasks: number
    }
  }[]
  pagination: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
  }
  filters: {
    search?: string
    status?: string
  }
}

export default class ListProjectsQuery extends BaseQuery<ListProjectsDTO, ListProjectsResult> {
  constructor(
    execCtx: ExecutionContext,
    private projectRepo = new OrganizationProjectRepository()
  ) {
    super(execCtx)
  }

  async handle(dto: ListProjectsDTO): Promise<ListProjectsResult> {
    const organizationId = this.getCurrentOrganizationId()
    if (!organizationId) {
      throw new Error('Organization context required')
    }

    const page = dto.page ?? 1
    const perPage = dto.perPage ?? 20

    // Fetch from repository
    const result = await this.projectRepo.listProjects(
      organizationId,
      {
        search: dto.search,
        status: dto.status,
      },
      page,
      perPage
    )

    const lastPage = Math.ceil(result.total / perPage)

    return {
      projects: result.projects,
      pagination: {
        total: result.total,
        perPage,
        currentPage: page,
        lastPage,
      },
      filters: {
        search: dto.search,
        status: dto.status,
      },
    }
  }
}
