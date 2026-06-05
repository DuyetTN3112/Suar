import type { HttpContext } from '@adonisjs/core/http'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { ORGANIZATION_PAGINATION as PAGINATION } from '#modules/organizations/actions/dtos/common/directory/organization_pagination'
import { CreateOrganizationDTO } from '#modules/organizations/actions/dtos/request/directory/create_organization_dto'
import { DeleteOrganizationDTO } from '#modules/organizations/actions/dtos/request/directory/delete_organization_dto'
import { GetOrganizationsListDTO } from '#modules/organizations/actions/dtos/request/directory/get_organizations_list_dto'
import { UpdateOrganizationDTO } from '#modules/organizations/actions/dtos/request/directory/update_organization_dto'
import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'
const ORGANIZATIONS_DEFAULT_LIMIT = 20
const VALID_SORT_BY = new Set(['created_at', 'name', 'updated_at'])

function requiredOrganizationId(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationException('Organization ID is required')
  }
  return value.trim()
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    if (value === 'true') return true
    if (value === 'false') return false
  }

  return fallback
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined
  return toBoolean(value)
}

function toSortBy(value: unknown): GetOrganizationsListDTO['sortBy'] {
  return typeof value === 'string' && VALID_SORT_BY.has(value) ? value : 'created_at'
}

function toSortOrder(value: unknown): 'asc' | 'desc' {
  return value === 'asc' ? 'asc' : 'desc'
}

export function buildCreateOrganizationDTO(request: HttpContext['request']): CreateOrganizationDTO {
  return new CreateOrganizationDTO(
    request.input('name') as string,
    toOptionalString(request.input('slug') as unknown),
    toOptionalString(request.input('description') as unknown),
    toOptionalString(request.input('logo') as unknown),
    toOptionalString(request.input('website') as unknown)
  )
}

export function buildUpdateOrganizationDTO(
  request: HttpContext['request'],
  organizationId: unknown
): UpdateOrganizationDTO {
  return new UpdateOrganizationDTO(
    requiredOrganizationId(organizationId),
    toOptionalString(request.input('name') as unknown),
    toOptionalString(request.input('slug') as unknown),
    toOptionalString(request.input('description') as unknown),
    toOptionalString(request.input('logo') as unknown),
    toOptionalString(request.input('website') as unknown)
  )
}

export function buildDeleteOrganizationDTO(
  request: HttpContext['request'],
  organizationId: unknown
): DeleteOrganizationDTO {
  return new DeleteOrganizationDTO(
    requiredOrganizationId(organizationId),
    toBoolean(request.input('permanent', false) as unknown),
    toOptionalString(request.input('reason') as unknown)
  )
}

export function buildOrganizationsListDTO(
  request: HttpContext['request'],
  defaultLimit: number = ORGANIZATIONS_DEFAULT_LIMIT
): GetOrganizationsListDTO {
  const pagination = normalizePagination(
    {
      page: request.input('page', PAGINATION.DEFAULT_PAGE) as unknown,
      limit: request.input('limit', defaultLimit) as unknown,
    },
    PAGINATION,
    { perPage: defaultLimit }
  )

  return new GetOrganizationsListDTO(
    pagination.page,
    pagination.perPage,
    toOptionalString(request.input('search') as unknown),
    toSortBy(request.input('sortBy', request.input('sort_by', 'created_at')) as unknown),
    toSortOrder(request.input('sortOrder', request.input('sort_order', 'desc')) as unknown),
    toOptionalString(request.input('plan') as unknown),
    toOptionalString(request.input('partner_type', request.input('partnerType')) as unknown),
    toOptionalBoolean(request.input('partner_is_active', request.input('partnerIsActive')) as unknown),
    toOptionalString(request.input('created_at_start', request.input('createdAtStart')) as unknown),
    toOptionalString(request.input('created_at_end', request.input('createdAtEnd')) as unknown)
  )
}
