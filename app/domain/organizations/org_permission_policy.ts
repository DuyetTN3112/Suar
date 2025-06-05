/**
 * Organization Permission Policy — Pure permission decision functions.
 *
 * All functions are synchronous, pure, and have 0 database dependencies.
 * They take pre-fetched context data and return PolicyResult.
 *
 * @module OrgPermissionPolicy
 */

import type {
  OrgOwnershipTransferContext,
  OrgMemberRemovalContext,
  OrgDeletionContext,
  OrgRoleChangeContext,
  OrgMemberAddContext,
  OrgJoinRequestProcessContext,
  OrgJoinRequestEligibility,
} from './org_types.js'
import type { PolicyResult } from '#domain/shared/policy_result'
import { PolicyResult as PR } from '#domain/shared/policy_result'
import { OrganizationRole } from '#constants/organization_constants'
import { isSameId } from '#libs/id_utils'

/**
 * Check if ownership can be transferred.
 *
 * Rules:
 * 1. Actor must be the current owner
 * 2. Cannot transfer to self
 * 3. New owner must be an approved member
 * 4. New owner must have at least org_admin role
 */
export function canTransferOwnership(ctx: OrgOwnershipTransferContext): PolicyResult {
  if (!isSameId(ctx.actorId, ctx.currentOwnerId)) {
    return PR.deny('Chỉ chủ sở hữu hiện tại mới có thể chuyển quyền sở hữu')
  }

  if (isSameId(ctx.actorId, ctx.newOwnerId)) {
    return PR.deny('Không thể chuyển quyền sở hữu cho chính mình', 'BUSINESS_RULE')
  }

  if (!ctx.isNewOwnerApprovedMember) {
    return PR.deny('Chủ sở hữu mới phải là thành viên đã được duyệt của tổ chức', 'BUSINESS_RULE')
  }

  const validRoles = [OrganizationRole.OWNER, OrganizationRole.ADMIN]
  if (!ctx.newOwnerRole || !validRoles.includes(ctx.newOwnerRole as OrganizationRole)) {
    return PR.deny('Chủ sở hữu mới phải có ít nhất vai trò org_admin', 'BUSINESS_RULE')
  }

  return PR.allow()
}

/**
 * Check if a member can be removed from the organization.
 *
 * Rules:
 * 1. Actor must be org owner or admin
 * 2. Cannot remove the org owner (must transfer ownership first)
 */
export function canRemoveMember(ctx: OrgMemberRemovalContext): PolicyResult {
  const adminRoles = [OrganizationRole.OWNER, OrganizationRole.ADMIN]
  if (!ctx.actorOrgRole || !adminRoles.includes(ctx.actorOrgRole as OrganizationRole)) {
    return PR.deny('Chỉ chủ sở hữu hoặc admin mới có thể xóa thành viên')
  }

  if (ctx.targetOrgRole === OrganizationRole.OWNER) {
    return PR.deny(
      'Không thể xóa chủ sở hữu tổ chức. Hãy chuyển quyền sở hữu trước.',
      'BUSINESS_RULE'
    )
  }

  return PR.allow()
}

/**
 * Check if an organization can be deleted.
 *
 * Rules:
 * 1. Actor must be org owner
 * 2. Cannot delete org with active projects
 */
export function canDeleteOrganization(ctx: OrgDeletionContext): PolicyResult {
  if (ctx.actorOrgRole !== OrganizationRole.OWNER) {
    return PR.deny('Chỉ chủ sở hữu tổ chức mới có thể xóa tổ chức')
  }

  if (ctx.activeProjectCount > 0) {
    return PR.deny(
      `Không thể xóa tổ chức có ${ctx.activeProjectCount} dự án đang hoạt động. Hãy lưu trữ hoặc xóa tất cả dự án trước.`,
      'BUSINESS_RULE'
    )
  }

  return PR.allow()
}

/**
 * Check if a member's role can be changed.
 *
 * Rules:
 * 1. Cannot change Owner's role
 * 2. Cannot promote to Owner (use transfer ownership instead)
 * 3. Cannot change own role
 * 4. Owner can update any non-owner role
 * 5. Admin can update non-owner roles
 * 6. Other roles cannot update
 */
export function canChangeRole(ctx: OrgRoleChangeContext): PolicyResult {
  if (ctx.targetCurrentRole === OrganizationRole.OWNER) {
    return PR.deny('Không thể thay đổi vai trò của owner tổ chức', 'BUSINESS_RULE')
  }

  if (ctx.targetNewRole === OrganizationRole.OWNER) {
    return PR.deny(
      'Không thể thăng cấp thành viên lên Owner. Hãy sử dụng chức năng chuyển giao quyền sở hữu.',
      'BUSINESS_RULE'
    )
  }

  if (ctx.isSelfUpdate) {
    return PR.deny('Bạn không thể thay đổi vai trò của chính mình', 'BUSINESS_RULE')
  }

  if (ctx.actorOrgRole === OrganizationRole.OWNER) {
    return PR.allow()
  }

  if (ctx.actorOrgRole === OrganizationRole.ADMIN) {
    return PR.allow()
  }

  return PR.deny('Bạn không có quyền thay đổi vai trò thành viên')
}

/**
 * Check if a member can be added to the organization.
 *
 * Rules:
 * 1. Actor must be Owner or Admin
 * 2. Target role must be a valid OrganizationRole
 * 3. Target must not already be a member
 */
export function canAddMember(ctx: OrgMemberAddContext): PolicyResult {
  const adminRoles = [OrganizationRole.OWNER, OrganizationRole.ADMIN]
  if (!ctx.actorOrgRole || !adminRoles.includes(ctx.actorOrgRole as OrganizationRole)) {
    return PR.deny('Chỉ chủ sở hữu hoặc admin mới có thể thêm thành viên')
  }

  const validRoles = Object.values(OrganizationRole) as string[]
  if (!validRoles.includes(ctx.targetRoleId)) {
    return PR.deny(`Vai trò không hợp lệ: ${ctx.targetRoleId}`, 'BUSINESS_RULE')
  }

  if (ctx.isAlreadyMember) {
    return PR.deny('Người dùng đã là thành viên của tổ chức này', 'BUSINESS_RULE')
  }

  return PR.allow()
}

/**
 * Check if a join request can be processed.
 *
 * Rules:
 * 1. Actor must be Owner or Admin
 * 2. Request must be PENDING
 * 3. Target must not already be a member (when approving)
 */
export function canProcessJoinRequest(ctx: OrgJoinRequestProcessContext): PolicyResult {
  const adminRoles = [OrganizationRole.OWNER, OrganizationRole.ADMIN]
  if (!ctx.actorOrgRole || !adminRoles.includes(ctx.actorOrgRole as OrganizationRole)) {
    return PR.deny('Bạn không có quyền xử lý yêu cầu tham gia tổ chức này')
  }

  if (ctx.requestStatus !== 'pending') {
    return PR.deny(`Yêu cầu tham gia đã được xử lý (${ctx.requestStatus})`, 'BUSINESS_RULE')
  }

  if (ctx.isTargetAlreadyMember) {
    return PR.deny('Người dùng đã là thành viên của tổ chức này', 'BUSINESS_RULE')
  }

  return PR.allow()
}

/**
 * Check if a user can create a join request.
 *
 * Rules:
 * 1. Must not already be a member
 * 2. Must not have a pending request
 */
export function canCreateJoinRequest(ctx: OrgJoinRequestEligibility): PolicyResult {
  if (ctx.isAlreadyMember) {
    return PR.deny('Bạn đã là thành viên của tổ chức này', 'BUSINESS_RULE')
  }

  if (ctx.hasPendingRequest) {
    return PR.deny('Bạn đã có yêu cầu tham gia đang chờ xử lý cho tổ chức này', 'BUSINESS_RULE')
  }

  return PR.allow()
}

/**
 * Check join eligibility based on existing membership status.
 * Returns eligibility result with localized message.
 *
 * v3.0: 'rejected' status now allows re-application (row updated back to 'pending')
 */
export function checkJoinEligibility(membershipStatus: string | null): {
  eligible: boolean
  message: string
} {
  if (membershipStatus === null) {
    return { eligible: true, message: '' }
  }

  if (membershipStatus === 'approved') {
    return { eligible: false, message: 'Bạn đã là thành viên của tổ chức này' }
  }

  if (membershipStatus === 'pending') {
    return { eligible: false, message: 'Yêu cầu tham gia tổ chức của bạn đang chờ được duyệt' }
  }

  // 'rejected' → allow re-application
  if (membershipStatus === 'rejected') {
    return { eligible: true, message: '' }
  }

  return {
    eligible: false,
    message: 'Trạng thái không xác định. Vui lòng liên hệ quản trị viên.',
  }
}
