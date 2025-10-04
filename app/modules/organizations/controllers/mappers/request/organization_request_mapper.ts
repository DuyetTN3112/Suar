import type { HttpContext } from '@adonisjs/core/http'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import { AddMemberDTO } from '#modules/organizations/actions/dtos/request/add_member_dto'
import { BulkAddMembersDTO } from '#modules/organizations/actions/dtos/request/bulk_add_members_dto'
import { CreateOrganizationDTO } from '#modules/organizations/actions/dtos/request/create_organization_dto'
import { DeleteOrganizationDTO } from '#modules/organizations/actions/dtos/request/delete_organization_dto'
import { GetOrganizationsListDTO } from '#modules/organizations/actions/dtos/request/get_organizations_list_dto'
import { ProcessJoinRequestDTO } from '#modules/organizations/actions/dtos/request/process_join_request_dto'
import { RemoveMemberDTO } from '#modules/organizations/actions/dtos/request/remove_member_dto'
import { UpdateOrganizationDTO } from '#modules/organizations/actions/dtos/request/update_organization_dto'
import type { OrganizationMembersPageFilters } from '#modules/organizations/actions/queries/get_organization_members_page_query'
import { ORGANIZATION_PAGINATION as PAGINATION } from '#modules/organizations/application/dtos/common/organization_pagination'
import { processJoinRequestValidator } from '#modules/organizations/validators/organization'
import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'
const ORGANIZATIONS_DEFAULT_LIMIT = 20
const VALID_SORT_BY = new Set(['created_at', 'name', 'updated_at'])

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

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(
    (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0
  )
}

function toStatusFilter(value: unknown): OrganizationMembersPageFilters['statusFilter'] {
  const status = toOptionalString(value)
  return status === 'active' || status === 'pending' || status === 'inactive' ? status : undefined
}

function toIncludeList(value: unknown): OrganizationMembersPageFilters['include'] {
  const values = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value
          .split(',')
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
      : []

  const allowed = new Set(['activity', 'audit'])
  const normalized = values.filter(
    (item): item is 'activity' | 'audit' => typeof item === 'string' && allowed.has(item)
  )

  return normalized.length > 0 ? normalized : undefined
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
  organizationId: string
): UpdateOrganizationDTO {
  return new UpdateOrganizationDTO(
    organizationId,
    toOptionalString(request.input('name') as unknown),
    toOptionalString(request.input('slug') as unknown),
    toOptionalString(request.input('description') as unknown),
    toOptionalString(request.input('logo') as unknown),
    toOptionalString(request.input('website') as unknown)
  )
}

export function buildDeleteOrganizationDTO(
  request: HttpContext['request'],
  organizationId: string
): DeleteOrganizationDTO {
  return new DeleteOrganizationDTO(
    organizationId,
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

export function buildOrganizationMembersPageFilters(
  request: HttpContext['request'],
  defaults: { page?: number; limit?: number } = {}
): OrganizationMembersPageFilters {
  const qs = request.qs() as Record<string, unknown>
  const pagination = normalizePagination(
    {
      page: qs['page'],
      limit: qs['limit'],
    },
    PAGINATION,
    {
      page: defaults.page ?? PAGINATION.DEFAULT_PAGE,
      perPage: defaults.limit ?? 100,
    }
  )

  return omitUndefined({
    page: pagination.page,
    limit: pagination.perPage,
    roleId: toOptionalString(qs['roleId'] ?? qs['org_role']),
    search: toOptionalString(qs['search']),
    statusFilter: toStatusFilter(qs['statusFilter'] ?? qs['status']),
    include: toIncludeList(qs['include']),
    joinDateStart: toOptionalString(qs['joinDateStart'] ?? qs['join_date_start']),
    joinDateEnd: toOptionalString(qs['joinDateEnd'] ?? qs['join_date_end']),
  })
}

export function buildRemoveMemberDTO(
  request: HttpContext['request'],
  organizationId: string,
  userId: string
): RemoveMemberDTO {
  return new RemoveMemberDTO(
    organizationId,
    userId,
    toOptionalString(request.input('reason') as unknown)
  )
}

export async function buildValidatedProcessJoinRequestInput(
  request: HttpContext['request'],
  organizationId: string,
  targetUserId: string
) {
  const { action } = await processJoinRequestValidator.validate(request.body())
  const approve = action === 'approve'

  return {
    dto: new ProcessJoinRequestDTO(
      organizationId,
      targetUserId,
      approve,
      toOptionalString(request.input('reason') as unknown)
    ),
    successMessage: approve ? 'Duyệt yêu cầu thành công' : 'Từ chối yêu cầu thành công',
  }
}

export function buildProcessJoinRequestDTO(
  request: HttpContext['request'],
  organizationId: string,
  targetUserId: string
) {
  const rawAction = request.input('action', 'approve') as string
  const approve = rawAction !== 'reject'

  return {
    dto: new ProcessJoinRequestDTO(
      organizationId,
      targetUserId,
      approve,
      toOptionalString(request.input('reason') as unknown)
    ),
    successMessage: approve
      ? 'Duyệt yêu cầu tham gia thành công'
      : 'Từ chối yêu cầu tham gia thành công',
  }
}

export function buildAddDirectMemberDTO(
  request: HttpContext['request'],
  organizationId: string
): AddMemberDTO {
  return new AddMemberDTO(
    organizationId,
    request.input('userId') as string,
    ((request.input('roleId') ?? request.input('org_role')) as string | undefined) ?? 'org_member'
  )
}

export function buildBulkAddMembersDTO(
  request: HttpContext['request'],
  organizationId: string,
  requesterId: string
): BulkAddMembersDTO {
  return new BulkAddMembersDTO(
    organizationId,
    toStringArray((request.input('userIds') ?? request.input('user_ids', [])) as unknown),
    requesterId
  )
}
