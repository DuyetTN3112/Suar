import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import { ORGANIZATION_PAGINATION as PAGINATION } from '#modules/organizations/application/dtos/common/organization_pagination'
import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'
import { CreateProjectDTO } from '#modules/projects/public_contracts/create_project_dto'
import type { ProjectVisibility } from '#modules/projects/public_contracts/project_constants'

const PROJECTS_DEFAULT_LIMIT = 20
const VALID_PROJECT_VISIBILITIES = new Set<string>(['public', 'private', 'team'])

function readAliasedInput(
  request: HttpContext['request'],
  camelKey: string,
  snakeKey: string,
  fallback?: unknown
): unknown {
  return request.input(camelKey, request.input(snakeKey, fallback))
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

function toOptionalDateTime(value: unknown): DateTime | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined
  }

  const parsed = DateTime.fromISO(value)
  return parsed.isValid ? parsed : undefined
}

function toOptionalVisibility(value: unknown): ProjectVisibility | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  return VALID_PROJECT_VISIBILITIES.has(value) ? (value as ProjectVisibility) : undefined
}

interface CurrentOrganizationProjectsListInput {
  page: number
  perPage: number
  search?: string
  status?: string
}

export function buildCreateCurrentOrganizationProjectDTO(
  request: HttpContext['request'],
  organizationId: string
): CreateProjectDTO {
  return CreateProjectDTO.fromValidatedPayload(
    omitUndefined({
      name: request.input('name') as string,
      description: toOptionalString(request.input('description') as unknown),
      status: toOptionalString(request.input('status') as unknown),
      start_date: toOptionalDateTime(readAliasedInput(request, 'startDate', 'start_date')) ?? null,
      end_date: toOptionalDateTime(readAliasedInput(request, 'endDate', 'end_date')) ?? null,
      manager_id: toOptionalString(readAliasedInput(request, 'managerId', 'manager_id')) ?? null,
      visibility: toOptionalVisibility(request.input('visibility') as unknown),
    }),
    organizationId
  )
}

export function buildCurrentOrganizationProjectsListInput(
  request: HttpContext['request']
): CurrentOrganizationProjectsListInput {
  const pagination = normalizePagination(
    {
      page: request.input('page', PAGINATION.DEFAULT_PAGE) as unknown,
      limit: request.input('limit', PROJECTS_DEFAULT_LIMIT) as unknown,
    },
    PAGINATION,
    { perPage: PROJECTS_DEFAULT_LIMIT }
  )

  return omitUndefined({
    page: pagination.page,
    perPage: pagination.perPage,
    search: toOptionalString(request.input('search') as unknown),
    status: toOptionalString(request.input('status') as unknown),
  })
}
