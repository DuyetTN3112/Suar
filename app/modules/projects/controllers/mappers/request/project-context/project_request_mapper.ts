import type { HttpContext } from '@adonisjs/core/http'

import {
  PAGINATION,
  PROJECTS_DEFAULT_LIMIT,
  parseBooleanRequestFlag,
  toDateTimeOrNull,
  toOptionalDateTime,
  parseOptionalRequestString,
  toOptionalVisibility,
  toProjectSortBy,
  toProjectSortOrder,
  toOptionalBoolean,
} from './project_request_parsers.js'

import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'
import { AddProjectMemberDTO } from '#modules/projects/actions/dtos/request/add_project_member_dto'
import { CreateProjectDTO } from '#modules/projects/actions/dtos/request/create_project_dto'
import { DeleteProjectDTO } from '#modules/projects/actions/dtos/request/delete_project_dto'
import { RemoveProjectMemberDTO } from '#modules/projects/actions/dtos/request/remove_project_member_dto'
import { UpdateProjectDTO } from '#modules/projects/actions/dtos/request/update_project_dto'
import { UpdateProjectMemberDTO } from '#modules/projects/actions/dtos/request/update_project_member_dto'
import type { ProjectRole } from '#modules/projects/public_contracts/project_constants'
import type { GetProjectsListDTO } from '#modules/projects/public_contracts/project_listing'

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


interface OrganizationProjectsListInput {
  page: number
  perPage: number
  search?: string
  status?: string
}

function readAliasedInput(
  request: HttpContext['request'],
  camelKey: string,
  snakeKey: string,
  fallback?: unknown
): unknown {
  return request.input(camelKey, request.input(snakeKey, fallback))
}

export function buildCreateProjectDTO(
  request: HttpContext['request'],
  organizationId: string
): CreateProjectDTO {
  return CreateProjectDTO.fromValidatedPayload(
    omitUndefined({
      name: request.input('name') as string,
      description: parseOptionalRequestString(request.input('description') as unknown),
      status: parseOptionalRequestString(request.input('status') as unknown),
      start_date:
        toOptionalDateTime(
          (request.input('startDate') ?? request.input('start_date')) as unknown
        ) ?? null,
      end_date:
        toOptionalDateTime((request.input('endDate') ?? request.input('end_date')) as unknown) ??
        null,
      manager_id:
        parseOptionalRequestString(
          (request.input('managerId') ?? request.input('manager_id')) as unknown
        ) ?? null,
      visibility: toOptionalVisibility(request.input('visibility') as unknown),
      business_domains: request.input('businessDomains', request.input('business_domains')) as
        | string[]
        | undefined,
    }),
    organizationId
  )
}

export function buildUpdateProjectDTO(
  request: HttpContext['request'],
  projectId: string
): UpdateProjectDTO {
  return UpdateProjectDTO.fromValidatedPayload(
    omitUndefined({
      name: request.input('name') as string | undefined,
      description: request.input('description') as string | null | undefined,
      status: request.input('status') as string | undefined,
      start_date: toDateTimeOrNull(
        request.input('startDate', request.input('start_date')) as unknown
      ),
      end_date: toDateTimeOrNull(request.input('endDate', request.input('end_date')) as unknown),
      business_domains: request.input('businessDomains', request.input('business_domains')) as
        | string[]
        | undefined,
    }),
    projectId
  )
}

export function buildProjectsListDTO(
  request: HttpContext['request'],
  organizationId: string
): GetProjectsListDTO {
  const pagination = normalizePagination(
    {
      page: request.input('page', PAGINATION.DEFAULT_PAGE),
      limit: request.input('limit', PROJECTS_DEFAULT_LIMIT),
    },
    PAGINATION,
    { perPage: PROJECTS_DEFAULT_LIMIT }
  )

  return omitUndefined({
    page: pagination.page,
    limit: pagination.perPage,
    organization_id: organizationId,
    status: parseOptionalRequestString(request.input('status') as unknown),
    creator_id: parseOptionalRequestString(readAliasedInput(request, 'creatorId', 'creator_id')),
    manager_id: parseOptionalRequestString(readAliasedInput(request, 'managerId', 'manager_id')),
    visibility: toOptionalVisibility(request.input('visibility') as unknown),
    search: parseOptionalRequestString(request.input('search') as unknown),
    sort_by: toProjectSortBy(readAliasedInput(request, 'sortBy', 'sort_by', 'created_at')),
    sort_order: toProjectSortOrder(readAliasedInput(request, 'sortOrder', 'sort_order', 'desc')),
    allow_external_contributors: toOptionalBoolean(
      readAliasedInput(
        request,
        'allowExternalContributors',
        'allow_external_contributors',
        request.input('allow_external_contributors')
      )
    ),
    start_date_start: parseOptionalRequestString(
      readAliasedInput(request, 'startDateStart', 'start_date_start')
    ),
    start_date_end: parseOptionalRequestString(
      readAliasedInput(request, 'startDateEnd', 'start_date_end')
    ),
    end_date_start: parseOptionalRequestString(
      readAliasedInput(request, 'endDateStart', 'end_date_start')
    ),
    end_date_end: parseOptionalRequestString(
      readAliasedInput(request, 'endDateEnd', 'end_date_end')
    ),
    created_at_start: parseOptionalRequestString(
      readAliasedInput(request, 'createdAtStart', 'created_at_start')
    ),
    created_at_end: parseOptionalRequestString(
      readAliasedInput(request, 'createdAtEnd', 'created_at_end')
    ),
  })
}

export function buildOrganizationProjectsListInput(
  request: HttpContext['request']
): OrganizationProjectsListInput {
  const pagination = normalizePagination(
    {
      page: request.input('page', PAGINATION.DEFAULT_PAGE),
      limit: request.input('limit', PROJECTS_DEFAULT_LIMIT),
    },
    PAGINATION,
    { perPage: PROJECTS_DEFAULT_LIMIT }
  )

  return omitUndefined({
    page: pagination.page,
    perPage: pagination.perPage,
    search: parseOptionalRequestString(request.input('search') as unknown),
    status: parseOptionalRequestString(request.input('status') as unknown),
  })
}

export function buildAddProjectMemberDTO(request: HttpContext['request']): AddProjectMemberDTO {
  return new AddProjectMemberDTO(
    omitUndefined({
      project_id: (request.input('projectId') ?? request.input('project_id')) as string,
      user_id: (request.input('userId') ?? request.input('user_id')) as string,
      project_role: (request.input('projectRole') ?? request.input('project_role')) as
        | ProjectRole
        | undefined,
      project_professional_role_id: parseOptionalRequestString(
        (request.input('projectProfessionalRoleId') ??
          request.input('project_professional_role_id')) as unknown
      ),
    })
  )
}

export function buildUpdateProjectMemberDTO(
  request: HttpContext['request'],
  userId: string
): UpdateProjectMemberDTO {
  return new UpdateProjectMemberDTO(
    omitUndefined({
      project_id: (request.input('projectId') ?? request.input('project_id')) as string,
      user_id: userId,
      project_role: (request.input('projectRole') ?? request.input('project_role')) as ProjectRole,
      project_professional_role_id: parseOptionalRequestString(
        (request.input('projectProfessionalRoleId') ??
          request.input('project_professional_role_id')) as unknown
      ),
    })
  )
}

export function buildRemoveProjectMemberDTO(
  request: HttpContext['request'],
  userId: string
): RemoveProjectMemberDTO {
  return new RemoveProjectMemberDTO(
    omitUndefined({
      project_id: (request.input('projectId') ?? request.input('project_id')) as string,
      user_id: userId,
      reason: request.input('reason') as string | undefined,
      reassign_to: (request.input('reassignTo') ?? request.input('reassign_to')) as
        | string
        | undefined,
    })
  )
}

export function buildDeleteProjectDTO(
  request: HttpContext['request'],
  projectId: string,
  currentOrganizationId?: string
): DeleteProjectDTO {
  return new DeleteProjectDTO(
    omitUndefined({
      project_id: projectId,
      reason: parseOptionalRequestString(request.input('reason') as unknown),
      permanent: parseBooleanRequestFlag(request.input('permanent', false) as unknown),
      currentOrganizationId,
    })
  )
}
