import type { HttpContext } from '@adonisjs/core/http'

import { OrganizationRole } from '#modules/organizations/access/public_contracts/organization_constants'
import { ProcessJoinRequestDTO } from '#modules/organizations/invitations/actions/dtos/request/process_join_request_dto'

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

export const buildProcessJoinRequestDTO = buildCurrentOrganizationProcessJoinRequestInput
