import { OrganizationRole } from '#constants/organization_constants'
import type { ExecutionContext } from '#types/execution_context'
import GetAssignableOrganizationRolesQuery from '#actions/organization/access/queries/get_assignable_organization_roles_query'
import { InviteUserDTO } from '../dtos/request/invite_user_dto.js'
import { UpdateMemberRoleDTO } from '../dtos/request/update_member_role_dto.js'

export interface InviteMemberRequestInput {
  organizationId: string
  email: string
  roleId?: string
  orgRole?: string
  message?: string
}

export interface UpdateMemberRoleRequestInput {
  organizationId: string
  userId: string
  roleId?: string
  orgRole?: string
}

export interface BuildMemberRequestOptions {
  resolveAssignableRoles?: boolean
}

function resolveRequestedRoleId(roleId?: string, orgRole?: string): string {
  return roleId ?? orgRole ?? OrganizationRole.MEMBER
}

async function resolveAllowedRoleIds(
  execCtx: ExecutionContext,
  organizationId: string,
  resolveAssignableRoles: boolean
): Promise<string[]> {
  if (!resolveAssignableRoles) {
    return [OrganizationRole.ADMIN, OrganizationRole.MEMBER]
  }

  const { roleIds } = await new GetAssignableOrganizationRolesQuery(execCtx).handle({
    organizationId,
  })

  return roleIds
}

export async function buildInviteUserDTO(
  execCtx: ExecutionContext,
  input: InviteMemberRequestInput,
  options: BuildMemberRequestOptions = {}
): Promise<InviteUserDTO> {
  const roleId = resolveRequestedRoleId(input.roleId, input.orgRole)
  const allowedRoleIds = await resolveAllowedRoleIds(
    execCtx,
    input.organizationId,
    options.resolveAssignableRoles ?? false
  )

  return new InviteUserDTO(input.organizationId, input.email, roleId, allowedRoleIds, input.message)
}

export async function buildUpdateMemberRoleDTO(
  execCtx: ExecutionContext,
  input: UpdateMemberRoleRequestInput,
  options: BuildMemberRequestOptions = {}
): Promise<UpdateMemberRoleDTO> {
  const roleId = resolveRequestedRoleId(input.roleId, input.orgRole)
  const allowedRoleIds = await resolveAllowedRoleIds(
    execCtx,
    input.organizationId,
    options.resolveAssignableRoles ?? false
  )

  return new UpdateMemberRoleDTO(input.organizationId, input.userId, roleId, allowedRoleIds)
}
