import type { UpdateMemberRoleDTO } from '../../dtos/request/members/update_member_role_dto.js'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { PolicyResult as PR } from '#modules/authorization/public_contracts/policy_result'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type {
  OrganizationMembershipRepository,
  OrganizationReader,
} from '#modules/organizations/actions/ports/outbound/members/organization_persistence'
import type { OrganizationTransaction } from '#modules/organizations/actions/ports/outbound/organization_transaction'
import GetAssignableOrganizationRolesQuery from '#modules/organizations/actions/queries/access/get_assignable_organization_roles_query'
import { canChangeRole } from '#modules/organizations/domain/access/org_permission_policy'
import { OrganizationRole } from '#modules/organizations/public_contracts/access/organization_constants'

export interface UpdateMemberRoleRequestInput {
  organizationId: string
  userId: string
  roleId?: string
  orgRole?: string
}

export interface BuildMemberRequestOptions {
  resolveAssignableRoles?: boolean
}

export interface RoleChangeContext {
  actorOrgRole: string
  targetCurrentRole: string
}

export async function resolveAllowedRoleIds(
  organizationId: string,
  resolveAssignableRoles: boolean,
  execCtx: OrganizationActionContext,
  organizations: OrganizationReader
): Promise<string[]> {
  if (!resolveAssignableRoles) {
    return [OrganizationRole.ADMIN, OrganizationRole.MEMBER]
  }

  const { roleIds } = await new GetAssignableOrganizationRolesQuery(
    execCtx,
    organizations
  ).handle({ organizationId })

  return roleIds
}

export async function fetchRoleChangeContext(
  dto: UpdateMemberRoleDTO,
  actorId: string,
  memberships: OrganizationMembershipRepository,
  trx: OrganizationTransaction
): Promise<RoleChangeContext> {
  const actorMembership = await memberships.getContext(dto.organizationId, actorId, trx)
  const targetMembership = await memberships.getContext(
    dto.organizationId,
    dto.userId,
    trx,
    false
  )
  const actorOrgRole = actorMembership?.role ?? null
  const targetCurrentRole = targetMembership?.role ?? null

  enforcePolicy(actorOrgRole ? PR.allow() : PR.deny('Bạn không phải thành viên của tổ chức này'))

  if (!targetCurrentRole) {
    throw new NotFoundException('Người dùng đích không phải thành viên của tổ chức này')
  }

  return { actorOrgRole: actorOrgRole as string, targetCurrentRole }
}

export function validateRoleChange(
  dto: UpdateMemberRoleDTO,
  actorId: string,
  context: RoleChangeContext
): void {
  enforcePolicy(
    canChangeRole({
      actorOrgRole: context.actorOrgRole,
      targetCurrentRole: context.targetCurrentRole,
      targetNewRole: dto.newRoleId,
      isSelfUpdate: dto.userId === actorId,
    })
  )

  if (context.targetCurrentRole === dto.newRoleId) {
    throw ConflictException.alreadyExists('Người dùng đã có vai trò này')
  }
}
