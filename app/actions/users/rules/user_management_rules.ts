/**
 * User Management Rules — Pure business rules for user administration.
 *
 * All functions are synchronous, pure, and have 0 database dependencies.
 * They take pre-fetched context data and return PolicyResult.
 *
 * @module UserManagementRules
 */

import type {
  UserApprovalContext,
  UserRoleChangeContext,
  UserDeactivationContext,
} from './user_types.js'
import type { PolicyResult } from '#actions/shared/rules/policy_result'
import { PolicyResult as PR } from '#actions/shared/rules/policy_result'
import { SystemRoleName } from '#constants/user_constants'
import { OrganizationUserStatus } from '#constants/organization_constants'
import { isSameId } from '#libs/id_utils'

/**
 * Check if actor can approve a pending user in an organization.
 *
 * Rules:
 * 1. Actor must have 'can_approve_members' permission (org owner/admin)
 * 2. Target user must be in 'pending' status
 */
export function canApproveUser(ctx: UserApprovalContext): PolicyResult {
  if (!ctx.hasApprovePermission) {
    return PR.deny('Bạn không có quyền phê duyệt thành viên trong tổ chức này')
  }

  if (ctx.targetMembershipStatus !== OrganizationUserStatus.PENDING) {
    return PR.deny(
      'Không tìm thấy yêu cầu phê duyệt người dùng này hoặc người dùng đã được phê duyệt',
      'BUSINESS_RULE'
    )
  }

  return PR.allow()
}

/**
 * Check if actor can change a user's system role.
 *
 * Rules:
 * 1. Only superadmin can change system roles
 * 2. Cannot change own role
 * 3. New role must be a valid SystemRoleName
 */
export function canChangeUserRole(ctx: UserRoleChangeContext): PolicyResult {
  if (!ctx.isActorSuperadmin) {
    return PR.deny('Chỉ superadmin mới có thể thay đổi vai trò người dùng')
  }

  if (isSameId(ctx.actorId, ctx.targetUserId)) {
    return PR.deny('Không thể thay đổi vai trò của chính mình', 'BUSINESS_RULE')
  }

  const validRoles = Object.values(SystemRoleName) as string[]
  if (!validRoles.includes(ctx.newRole)) {
    return PR.deny(`Vai trò không hợp lệ: ${ctx.newRole}`, 'BUSINESS_RULE')
  }

  return PR.allow()
}

/**
 * Check if actor can deactivate a user.
 *
 * Rules:
 * 1. Only superadmin can deactivate users
 * 2. Cannot deactivate self
 */
export function canDeactivateUser(ctx: UserDeactivationContext): PolicyResult {
  if (!ctx.isActorSuperadmin) {
    return PR.deny('Chỉ superadmin mới có thể deactivate users')
  }

  if (isSameId(ctx.actorId, ctx.targetUserId)) {
    return PR.deny('Không thể deactivate chính mình', 'BUSINESS_RULE')
  }

  return PR.allow()
}

/**
 * Validate that a system role name is valid.
 */
export function validateSystemRole(role: string): PolicyResult {
  const validRoles = Object.values(SystemRoleName) as string[]
  if (!validRoles.includes(role)) {
    return PR.deny(`Vai trò không hợp lệ: ${role}`, 'BUSINESS_RULE')
  }
  return PR.allow()
}
