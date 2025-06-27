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
import type { PolicyResult } from '#domain/shared/policy_result'
import { PolicyResult as PR } from '#domain/shared/policy_result'
import { SystemRoleName } from '#constants/user_constants'
import { OrganizationRole, OrganizationUserStatus } from '#constants/organization_constants'
import { isSameId } from '#domain/shared/id_utils'

const SYSTEM_ADMIN_ROLES = new Set<string>([SystemRoleName.SUPERADMIN, SystemRoleName.SYSTEM_ADMIN])

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
 * Check if actor can toggle admin mode.
 *
 * Rules:
 * 1. Only superadmin or system_admin can use admin mode
 */
export function canToggleAdminMode(actorSystemRole: string | null): PolicyResult {
  return canAccessSystemAdministration(actorSystemRole)
}

export function canAccessSystemAdministration(actorSystemRole: string | null): PolicyResult {
  if (actorSystemRole && SYSTEM_ADMIN_ROLES.has(actorSystemRole)) {
    return PR.allow()
  }

  return PR.deny('Chỉ system admin mới được chuyển Admin Mode')
}

export function canAccessAllowedSystemRoles(
  actorSystemRole: string | null,
  allowedRoles: string[]
): PolicyResult {
  if (!actorSystemRole) {
    return PR.deny('Bạn không có quyền truy cập chức năng này')
  }

  const normalizedRole = actorSystemRole.toLowerCase()
  const normalizedAllowedRoles = allowedRoles.map((role) => role.toLowerCase())
  const normalizedSystemAdminRoles = [...SYSTEM_ADMIN_ROLES].map((role) => role.toLowerCase())

  if (
    normalizedSystemAdminRoles.includes(normalizedRole) ||
    normalizedAllowedRoles.includes(normalizedRole)
  ) {
    return PR.allow()
  }

  return PR.deny('Bạn không có quyền truy cập chức năng này')
}

export function canAccessUserAdministrationQueue(input: {
  actorSystemRole: string | null
  actorOrgRole: string | null
}): PolicyResult {
  if (input.actorSystemRole && SYSTEM_ADMIN_ROLES.has(input.actorSystemRole)) {
    return PR.allow()
  }

  if (input.actorOrgRole === OrganizationRole.OWNER) {
    return PR.allow()
  }

  return PR.deny('Bạn không có quyền truy cập khu vực quản trị người dùng')
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
