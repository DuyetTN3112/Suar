import type { HttpContext } from '@adonisjs/core/http'

import { ProcessJoinRequestDTO } from '#actions/organizations/dtos/request/process_join_request_dto'
import { RemoveMemberDTO } from '#actions/organizations/dtos/request/remove_member_dto'
import { OrganizationRole } from '#constants/organization_constants'
import type { DatabaseId } from '#types/database'

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

export function buildCurrentOrganizationInviteMemberInput(
  request: HttpContext['request'],
  organizationId: DatabaseId
) {
  return {
    organizationId,
    email: request.input('email') as string,
    roleId:
      (request.input('roleId') as string | undefined) ??
      (request.input('org_role') as string | undefined) ??
      OrganizationRole.MEMBER,
  }
}

export function buildCurrentOrganizationRemoveMemberDTO(
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

export function buildCurrentOrganizationRoleUpdateInput(
  request: HttpContext['request'],
  organizationId: DatabaseId,
  userId: DatabaseId
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

export function buildCurrentOrganizationProcessJoinRequestInput(
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
