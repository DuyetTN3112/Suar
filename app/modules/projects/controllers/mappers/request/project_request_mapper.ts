import type { HttpContext } from '@adonisjs/core/http'

import {
  PAGINATION,
  PROJECTS_DEFAULT_LIMIT,
  toBoolean,
  toDateTimeOrNull,
  toOptionalDateTime,
  toOptionalNumber,
  toOptionalString,
  toOptionalVisibility,
  toPositiveNumber,
  toProjectSortBy,
  toProjectSortOrder,
} from './shared.js'

import { AddProjectMemberDTO } from '#actions/projects/dtos/request/add_project_member_dto'
import { CreateProjectDTO } from '#actions/projects/dtos/request/create_project_dto'
import { DeleteProjectDTO } from '#actions/projects/dtos/request/delete_project_dto'
import { UpdateProjectDTO } from '#actions/projects/dtos/request/update_project_dto'
import type { GetProjectsListDTO } from '#actions/projects/queries/get_projects_list_query'
import type { ProjectRole } from '#modules/projects/constants/project_constants'

interface OrganizationProjectsListInput {
  page: number
  perPage: number
  search?: string
  status?: string
}

export function buildCreateProjectDTO(
  request: HttpContext['request'],
  organizationId: string
): CreateProjectDTO {
  return CreateProjectDTO.fromValidatedPayload(
    {
      name: request.input('name') as string,
      description: toOptionalString(request.input('description') as unknown),
      status: toOptionalString(request.input('status') as unknown),
      start_date: toOptionalDateTime(request.input('start_date') as unknown) ?? null,
      end_date: toOptionalDateTime(request.input('end_date') as unknown) ?? null,
      manager_id: toOptionalString(request.input('manager_id') as unknown) ?? null,
      visibility: toOptionalVisibility(request.input('visibility') as unknown),
      budget: toOptionalNumber(request.input('budget') as unknown),
    },
    organizationId
  )
}

export function buildUpdateProjectDTO(
  request: HttpContext['request'],
  projectId: string
): UpdateProjectDTO {
  return UpdateProjectDTO.fromValidatedPayload(
    {
      name: request.input('name') as string | undefined,
      description: request.input('description') as string | null | undefined,
      status: request.input('status') as string | undefined,
      start_date: toDateTimeOrNull(request.input('start_date') as unknown),
      end_date: toDateTimeOrNull(request.input('end_date') as unknown),
    },
    projectId
  )
}

export function buildProjectsListDTO(
  request: HttpContext['request'],
  organizationId: string
): GetProjectsListDTO {
  return {
    page: toPositiveNumber(request.input('page', PAGINATION.DEFAULT_PAGE) as unknown),
    limit: toPositiveNumber(
      request.input('limit', PROJECTS_DEFAULT_LIMIT) as unknown,
      PROJECTS_DEFAULT_LIMIT
    ),
    organization_id: organizationId,
    status: toOptionalString(request.input('status') as unknown),
    creator_id: toOptionalString(request.input('creator_id') as unknown),
    manager_id: toOptionalString(request.input('manager_id') as unknown),
    visibility: toOptionalVisibility(request.input('visibility') as unknown),
    search: toOptionalString(request.input('search') as unknown),
    sort_by: toProjectSortBy(request.input('sort_by', 'created_at') as unknown),
    sort_order: toProjectSortOrder(request.input('sort_order', 'desc') as unknown),
  }
}

export function buildOrganizationProjectsListInput(
  request: HttpContext['request']
): OrganizationProjectsListInput {
  return {
    page: toPositiveNumber(request.input('page', PAGINATION.DEFAULT_PAGE) as unknown),
    perPage: toPositiveNumber(
      request.input('limit', PROJECTS_DEFAULT_LIMIT) as unknown,
      PROJECTS_DEFAULT_LIMIT
    ),
    search: toOptionalString(request.input('search') as unknown),
    status: toOptionalString(request.input('status') as unknown),
  }
}

export function buildAddProjectMemberDTO(request: HttpContext['request']): AddProjectMemberDTO {
  return new AddProjectMemberDTO({
    project_id: request.input('project_id') as string,
    user_id: request.input('user_id') as string,
    project_role: request.input('project_role') as ProjectRole | undefined,
  })
}

export function buildDeleteProjectDTO(
  request: HttpContext['request'],
  projectId: string,
  currentOrganizationId?: string
): DeleteProjectDTO {
  return new DeleteProjectDTO({
    project_id: projectId,
    reason: toOptionalString(request.input('reason') as unknown),
    permanent: toBoolean(request.input('permanent', false) as unknown),
    current_organization_id: currentOrganizationId,
  })
}
