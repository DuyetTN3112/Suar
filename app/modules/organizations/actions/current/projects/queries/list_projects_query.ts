import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import { BaseQuery } from '#modules/organizations/actions/base_query'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import type { OrganizationProjectSearchCandidateReader } from '#modules/organizations/actions/ports/organization_project_search_candidate_reader'
import { ORGANIZATION_PAGINATION } from '#modules/organizations/application/dtos/common/organization_pagination'
import { EngineOrganizationProjectSearchCandidateReader } from '#modules/organizations/infra/adapters/engine_organization_project_search_candidate_reader'
import OrganizationProjectRepository from '#modules/organizations/infra/current/repositories/organization_project_repository'
import {
  buildPaginationMeta,
  normalizePagination,
  toWindowLimit,
} from '#modules/pagination/public_contracts/pagination_public_api'
import { isSearchRuntimeEnabled } from '#modules/search/public_contracts/search_engine'

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
    execCtx: OrganizationActionContext,
    private projectRepo = new OrganizationProjectRepository(),
    private readonly projectSearchCandidateReader: OrganizationProjectSearchCandidateReader = new EngineOrganizationProjectSearchCandidateReader()
  ) {
    super(execCtx)
  }

  async handle(dto: ListProjectsDTO): Promise<ListProjectsResult> {
    const organizationId = this.getCurrentOrganizationId()
    if (!organizationId) {
      throw new Error('Organization context required')
    }

    const pagination = normalizePagination(dto, ORGANIZATION_PAGINATION)
    const projectIds = await this.resolveEngineProjectIds(
      dto.search,
      pagination.page,
      pagination.perPage
    )

    // Fetch from repository
    const result = await this.projectRepo.listProjects(
      organizationId,
      omitUndefined({
        search: projectIds ? undefined : dto.search,
        status: dto.status,
        projectIds: projectIds ?? undefined,
      }),
      pagination.page,
      pagination.perPage
    )
    const meta = buildPaginationMeta(result.total, pagination)

    return {
      projects: result.projects,
      pagination: {
        total: meta.total,
        perPage: meta.perPage,
        currentPage: meta.currentPage,
        lastPage: meta.lastPage,
      },
      filters: omitUndefined({
        search: dto.search,
        status: dto.status,
      }),
    }
  }

  private async resolveEngineProjectIds(
    search: string | undefined,
    page: number,
    perPage: number
  ): Promise<string[] | null> {
    if (!search?.trim() || !isSearchRuntimeEnabled()) {
      return null
    }

    try {
      const hits = await this.projectSearchCandidateReader.searchProjectCandidates({
        q: search,
        limit: toWindowLimit(page, perPage),
      })

      if (hits.length === 0) {
        return null
      }

      return hits.map((hit) => hit.projectId)
    } catch {
      return null
    }
  }
}
