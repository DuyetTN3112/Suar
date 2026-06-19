import type { HttpContext } from '@adonisjs/core/http'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { validationIssue } from '#modules/errors/public_contracts/validation_issue'
import { ProcessJoinRequestDTO } from '#modules/organizations/actions/dtos/request/invitations/process_join_request_dto'
import { OrganizationRole } from '#modules/organizations/public_contracts/access/organization_constants'

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

export function buildCurrentOrganizationInviteMemberInput(
  request: HttpContext['request'],
  organizationId: string
) {
  const email: unknown = request.input('email')
  const roleId: unknown = request.input('roleId') ?? request.input('org_role') ?? OrganizationRole.MEMBER
  const issues = []
  if (typeof email !== 'string' || email.trim().length === 0) {
    issues.push(validationIssue('email', 'email is required', 'REQUEST_EMAIL_REQUIRED'))
  }
  if (typeof roleId !== 'string' || roleId.trim().length === 0) {
    issues.push(validationIssue('roleId', 'roleId must be a non-empty string', 'REQUEST_STRING_REQUIRED'))
  }
  if (issues.length > 0) throw ValidationException.fromIssues(issues)
  const normalizedEmail = typeof email === 'string' ? email.trim() : ''
  const normalizedRoleId = typeof roleId === 'string' ? roleId.trim() : ''
  return {
    organizationId,
    email: normalizedEmail,
    roleId: normalizedRoleId,
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
