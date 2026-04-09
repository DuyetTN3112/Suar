import type { HttpContext } from '@adonisjs/core/http'
import { PAGINATION } from '#constants/common_constants'
import { processJoinRequestValidator } from '#validators/organization'
import { CreateOrganizationDTO } from '#actions/organizations/dtos/request/create_organization_dto'
import { GetOrganizationsListDTO } from '#actions/organizations/dtos/request/get_organizations_list_dto'
import { BulkAddMembersDTO } from '#actions/organizations/dtos/request/bulk_add_members_dto'
import { AddMemberDTO } from '#actions/organizations/dtos/request/add_member_dto'
import { RemoveMemberDTO } from '#actions/organizations/dtos/request/remove_member_dto'
import { ProcessJoinRequestDTO } from '#actions/organizations/dtos/request/process_join_request_dto'
import type { DatabaseId } from '#types/database'

const ORGANIZATIONS_DEFAULT_LIMIT = 20
const VALID_SORT_BY = new Set(['created_at', 'name', 'updated_at'])

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function toPositiveNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(1, Math.trunc(value))
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return Math.max(1, Math.trunc(parsed))
    }
  }

  return fallback
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

export function buildCreateOrganizationDTO(request: HttpContext['request']): CreateOrganizationDTO {
  return new CreateOrganizationDTO(
    request.input('name') as string,
    toOptionalString(request.input('slug') as unknown),
    toOptionalString(request.input('description') as unknown),
    toOptionalString(request.input('logo') as unknown),
    toOptionalString(request.input('website') as unknown)
  )
}

export function buildOrganizationsListDTO(
  request: HttpContext['request'],
  defaultLimit: number = ORGANIZATIONS_DEFAULT_LIMIT
): GetOrganizationsListDTO {
  return new GetOrganizationsListDTO(
    toPositiveNumber(
      request.input('page', PAGINATION.DEFAULT_PAGE) as unknown,
      PAGINATION.DEFAULT_PAGE
    ),
    toPositiveNumber(request.input('limit', defaultLimit) as unknown, defaultLimit),
    toOptionalString(request.input('search') as unknown),
    toSortBy(request.input('sort_by', 'created_at') as unknown),
    toSortOrder(request.input('sort_order', 'desc') as unknown)
  )
}

export function buildRemoveMemberDTO(
  request: HttpContext['request'],
  organizationId: DatabaseId,
  userId: DatabaseId
): RemoveMemberDTO {
  return new RemoveMemberDTO(
    organizationId,
    userId,
    toOptionalString(request.input('reason') as unknown)
  )
}

export async function buildValidatedProcessJoinRequestInput(
  request: HttpContext['request'],
  organizationId: DatabaseId,
  targetUserId: DatabaseId
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
  organizationId: DatabaseId,
  targetUserId: DatabaseId
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
  organizationId: DatabaseId
): AddMemberDTO {
  return new AddMemberDTO(
    organizationId,
    request.input('userId') as string,
    ((request.input('roleId') ?? request.input('org_role')) as string | undefined) ?? 'org_member'
  )
}

export function buildBulkAddMembersDTO(
  request: HttpContext['request'],
  organizationId: DatabaseId,
  requesterId: DatabaseId
): BulkAddMembersDTO {
  return new BulkAddMembersDTO(
    organizationId,
    toStringArray(request.input('user_ids', [])),
    requesterId
  )
}
