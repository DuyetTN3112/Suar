import type { HttpContext } from '@adonisjs/core/http'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import { OrganizationRole } from '#modules/organizations/access/public_contracts/organization_constants'
import { ORGANIZATION_PAGINATION as PAGINATION } from '#modules/organizations/members/actions/dtos/common/organization_pagination'
import { AddMemberDTO } from '#modules/organizations/members/actions/dtos/request/add_member_dto'
import { BulkAddMembersDTO } from '#modules/organizations/members/actions/dtos/request/bulk_add_members_dto'
import { RemoveMemberDTO } from '#modules/organizations/members/actions/dtos/request/remove_member_dto'
import type { OrganizationMembersPageFilters } from '#modules/organizations/members/actions/query/get_organization_members_page_query'
import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0
      )
    : []
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

export function buildOrganizationMembersPageFilters(
  request: HttpContext['request'],
  defaults: { page?: number; limit?: number } = {}
): OrganizationMembersPageFilters {
  const qs = request.qs() as Record<string, unknown>
  const pagination = normalizePagination(
    { page: qs['page'], limit: qs['limit'] },
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
  return buildCurrentOrganizationRemoveMemberDTO(request, organizationId, userId)
}

export function buildAddDirectMemberDTO(
  request: HttpContext['request'],
  organizationId: string
): AddMemberDTO {
  return new AddMemberDTO(
    organizationId,
    request.input('userId') as string,
    ((request.input('roleId') ?? request.input('org_role')) as string | undefined) ??
      OrganizationRole.MEMBER
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

export function buildCurrentOrganizationRemoveMemberDTO(
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

export function buildCurrentOrganizationRoleUpdateInput(
  request: HttpContext['request'],
  organizationId: string,
  userId: string
) {
  return {
    organizationId,
    userId,
    roleId:
      (request.input('roleId') as string | undefined) ??
      (request.input('org_role') as string | undefined) ??
      OrganizationRole.MEMBER,
  }
}
