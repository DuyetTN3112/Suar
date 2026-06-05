import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import { ORGANIZATION_PAGINATION } from '#modules/organizations/actions/dtos/common/projects/organization_pagination'
import type { OrganizationProjectListReader } from '#modules/organizations/actions/ports/outbound/projects/organization_project_list_reader'
import { BaseQuery } from '#modules/organizations/actions/queries/base_query'
import {
  buildPaginationMeta,
  normalizePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'

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
    private readonly projects: OrganizationProjectListReader
  ) {
    super(execCtx)
  }

  async handle(dto: ListProjectsDTO): Promise<ListProjectsResult> {
    const organizationId = this.getCurrentOrganizationId()
    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }
    const actorId = this.getCurrentUserId()
    if (!actorId) {
      throw new UnauthorizedException()
    }

    const pagination = normalizePagination(dto, ORGANIZATION_PAGINATION)

    const result = await this.projects.list(
      omitUndefined({
        organizationId,
        actorId,
        page: pagination.page,
        perPage: pagination.perPage,
        search: dto.search,
        status: dto.status,
      })
    )
    const meta = buildPaginationMeta(result.total, pagination)

    return {
      projects: result.projects.map((project) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        created_at: project.createdAt,
        _count: {
          members: project.memberCount,
          tasks: project.taskCount,
        },
      })),
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

}
