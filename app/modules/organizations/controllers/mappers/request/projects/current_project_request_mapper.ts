import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

import { ORGANIZATION_PAGINATION as PAGINATION } from '#modules/organizations/actions/dtos/common/projects/organization_pagination'
import type {
  OrganizationProjectCreateInput,
  OrganizationProjectVisibility,
} from '#modules/organizations/actions/dtos/request/projects/organization_project_create_input'
import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'

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

function toOptionalIsoDate(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined
  }

  const parsed = DateTime.fromISO(value)
  return parsed.isValid ? parsed.toISO() : undefined
}

function toOptionalVisibility(value: unknown): OrganizationProjectVisibility | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  return VALID_PROJECT_VISIBILITIES.has(value)
    ? (value as OrganizationProjectVisibility)
    : undefined
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
): OrganizationProjectCreateInput {
  return omitUndefined({
    name: request.input('name') as string,
    organization_id: organizationId,
    description: toOptionalString(request.input('description') as unknown),
    status: toOptionalString(request.input('status') as unknown),
    start_date: toOptionalIsoDate(readAliasedInput(request, 'startDate', 'start_date')) ?? null,
    end_date: toOptionalIsoDate(readAliasedInput(request, 'endDate', 'end_date')) ?? null,
    manager_id: toOptionalString(readAliasedInput(request, 'managerId', 'manager_id')) ?? null,
    visibility: toOptionalVisibility(request.input('visibility') as unknown),
  })
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
