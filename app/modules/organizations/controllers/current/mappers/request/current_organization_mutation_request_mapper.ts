import type { HttpContext } from '@adonisjs/core/http'

import { ProcessJoinRequestDTO } from '#modules/organizations/actions/dtos/request/process_join_request_dto'
import { RemoveMemberDTO } from '#modules/organizations/actions/dtos/request/remove_member_dto'
import { OrganizationRole } from '#modules/organizations/public_contracts/organization_constants'

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

export function buildCurrentOrganizationInviteMemberInput(
  request: HttpContext['request'],
  organizationId: string
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

export function buildCurrentOrganizationProcessJoinRequestInput(
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
