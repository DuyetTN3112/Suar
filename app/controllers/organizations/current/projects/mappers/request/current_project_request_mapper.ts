import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

import { CreateProjectDTO } from '#actions/projects/dtos/request/create_project_dto'
import { PAGINATION } from '#constants/common_constants'
import type { ProjectVisibility } from '#constants/project_constants'

const PROJECTS_DEFAULT_LIMIT = 20
const VALID_PROJECT_VISIBILITIES = new Set<string>(['public', 'private', 'team'])

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  return undefined
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

function toPositiveNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(1, Math.trunc(value))
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? Math.max(1, Math.trunc(parsed)) : fallback
  }

  return fallback
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

export function buildCurrentOrganizationProjectsListInput(
  request: HttpContext['request']
): CurrentOrganizationProjectsListInput {
  return {
    page: toPositiveNumber(request.input('page', PAGINATION.DEFAULT_PAGE) as unknown, 1),
    perPage: toPositiveNumber(
      request.input('limit', PROJECTS_DEFAULT_LIMIT) as unknown,
      PROJECTS_DEFAULT_LIMIT
    ),
    search: toOptionalString(request.input('search') as unknown),
    status: toOptionalString(request.input('status') as unknown),
  }
}
