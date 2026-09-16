import type { InviteUserDTO } from '../../dtos/request/invitations/invite_user_dto.js'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type { OrganizationUserReaderWriter } from '#modules/organizations/actions/ports/outbound/invitations/organization_external_dependencies'
import type {
  OrganizationMembershipRepository,
  OrganizationReader,
} from '#modules/organizations/actions/ports/outbound/invitations/organization_persistence'
import type { OrganizationTransaction } from '#modules/organizations/actions/ports/outbound/organization_transaction'
import GetAssignableOrganizationRolesQuery from '#modules/organizations/actions/queries/access/get_assignable_organization_roles_query'
import { canInviteOrganizationMembers } from '#modules/organizations/domain/access/org_permission_policy'
import { OrganizationRole } from '#modules/organizations/public_contracts/access/organization_constants'

export interface InviteMemberRequestInput {
  organizationId: string
  email: string
  roleId?: string
  orgRole?: string
  message?: string
}

export interface BuildInviteUserRequestOptions {
  resolveAssignableRoles?: boolean
}

export interface ValidatedInvitationContext {
  normalizedEmail: string
  inviteeId: string
  organizationName: string
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

export async function checkPermissions(
  organizationId: string,
  userId: string,
  memberships: OrganizationMembershipRepository,
  trx: OrganizationTransaction
): Promise<void> {
  const actorMembership = await memberships.getContext(organizationId, userId, trx)
  const actorOrgRole = actorMembership?.role ?? null
  enforcePolicy(canInviteOrganizationMembers(actorOrgRole))
}

export async function checkDuplicateInvitation(
  organizationId: string,
  inviteeUserId: string,
  email: string,
  memberships: OrganizationMembershipRepository,
  trx: OrganizationTransaction
): Promise<void> {
  const membership = await memberships.find(organizationId, inviteeUserId, trx)

  if (!membership) {
    return
  }

  if (membership.status === 'approved') {
    throw ConflictException.alreadyExists('Người dùng này đã là thành viên của tổ chức')
  }

  if (membership.status === 'pending' && membership.invited_by) {
    throw ConflictException.alreadyExists(
      `Lời mời cho email ${email} đã tồn tại và đang chờ xử lý`
    )
  }

  if (membership.status === 'pending') {
    throw ConflictException.alreadyExists(
      'Người dùng này đã có yêu cầu tham gia tổ chức đang chờ xử lý'
    )
  }

  throw ConflictException.alreadyExists(
    'Người dùng này đã từng bị từ chối hoặc đã tồn tại trong tổ chức'
  )
}

export async function validateInvitationContext(
  dto: InviteUserDTO,
  userId: string,
  userReaderWriter: OrganizationUserReaderWriter,
  organizations: OrganizationReader,
  memberships: OrganizationMembershipRepository,
  trx: OrganizationTransaction
): Promise<ValidatedInvitationContext> {
  await checkPermissions(dto.organizationId, userId, memberships, trx)

  const normalizedEmail = dto.getNormalizedEmail()
  const invitee = await userReaderWriter.findUserByEmail(normalizedEmail, trx)
  if (!invitee) {
    throw new NotFoundException('Không tìm thấy người dùng với email này')
  }

  const inviteeIsActive = await userReaderWriter.isActiveUser(invitee.id, trx)
  if (!inviteeIsActive) {
    throw new NotFoundException('Không tìm thấy người dùng với email này')
  }

  await checkDuplicateInvitation(dto.organizationId, invitee.id, normalizedEmail, memberships, trx)

  const organization = await organizations.findById(dto.organizationId, trx)
  if (!organization) {
    throw NotFoundException.resource('Tổ chức', dto.organizationId)
  }

  return {
    normalizedEmail,
    inviteeId: invitee.id,
    organizationName: organization.name,
  }
}
