import { ProjectRole } from '../../public_contracts/project_constants.js'
import type {
  ProjectPermissionContext,
  ProjectOwnershipTransferContext,
  ProjectMemberAddContext,
  ProjectMemberRemovalContext,
} from '../project-context/project_types.js'

import { ProjectOrgRole } from './role_contracts.js'

import type { PolicyResult } from '#modules/authorization/public_contracts/policy_result'
import { PolicyResult as PR } from '#modules/authorization/public_contracts/policy_result'

const isSameId = (a: string, b: string): boolean => a === b

function isOrgOwnerOrAdmin(orgRole: string | null): boolean {
  return orgRole === ProjectOrgRole.OWNER || orgRole === ProjectOrgRole.ADMIN
}

function canManageProject(ctx: ProjectPermissionContext): boolean {
  if (isSameId(ctx.projectOwnerId, ctx.actorId)) return true
  if (isSameId(ctx.projectCreatorId, ctx.actorId)) return true
  if (isOrgOwnerOrAdmin(ctx.actorOrgRole)) return true
  return false
}

/**
 * Check whether actor can view project members.
 */
export function canViewProjectMembers(ctx: { hasProjectAccess: boolean }): PolicyResult {
  if (ctx.hasProjectAccess) return PR.allow()

  return PR.deny('Bạn không có quyền xem danh sách thành viên của dự án này')
}

/**
 * Check if actor can manage project members (add/remove/change role).
 *
 * Priority:
 * 1. Project owner → allow
 * 2. Project creator → allow
 * 3. Org owner/admin → allow
 * 4. Deny
 */
export function canManageProjectMembers(ctx: ProjectPermissionContext): PolicyResult {
  if (canManageProject(ctx)) return PR.allow()
  return PR.deny('Chỉ owner hoặc admin mới có thể quản lý thành viên dự án')
}

/**
 * Check if a member can be added to the project.
 *
 * Rules:
 * 1. Actor must have manage permission
 * 2. Target role must be a valid ProjectRole
 * 3. Target must be an approved org member
 * 4. Target must not already be a project member
 */
export function canAddProjectMember(ctx: ProjectMemberAddContext): PolicyResult {
  const hasPermission =
    isSameId(ctx.projectOwnerId, ctx.actorId) ||
    isSameId(ctx.projectCreatorId, ctx.actorId) ||
    isOrgOwnerOrAdmin(ctx.actorOrgRole)

  if (!hasPermission) {
    return PR.deny('Chỉ owner hoặc admin mới có thể thêm thành viên vào dự án')
  }

  const validRoles = Object.values(ProjectRole) as string[]
  if (!validRoles.includes(ctx.targetRole)) {
    return PR.deny(`Vai trò dự án không hợp lệ: ${ctx.targetRole}`, 'BUSINESS_RULE')
  }

  if (!ctx.isTargetOrgMember) {
    return PR.deny('Người dùng không thuộc tổ chức của dự án', 'BUSINESS_RULE')
  }

  if (ctx.isAlreadyMember) {
    return PR.deny('Người dùng đã là thành viên của dự án', 'BUSINESS_RULE')
  }

  return PR.allow()
}

/**
 * Check if a member can be removed from the project.
 *
 * Rules:
 * 1. Actor must have manage permission
 * 2. Cannot remove the project owner
 * 3. Cannot remove the project creator
 */
export function canRemoveProjectMember(ctx: ProjectMemberRemovalContext): PolicyResult {
  const hasPermission =
    isSameId(ctx.projectOwnerId, ctx.actorId) ||
    isSameId(ctx.projectCreatorId, ctx.actorId) ||
    isOrgOwnerOrAdmin(ctx.actorOrgRole)

  if (!hasPermission) {
    return PR.deny('Chỉ owner hoặc admin mới có thể xóa thành viên khỏi dự án')
  }

  if (isSameId(ctx.projectOwnerId, ctx.targetUserId)) {
    return PR.deny('Không thể xóa owner khỏi dự án', 'BUSINESS_RULE')
  }

  if (isSameId(ctx.projectCreatorId, ctx.targetUserId)) {
    return PR.deny('Không thể xóa người tạo dự án', 'BUSINESS_RULE')
  }

  return PR.allow()
}

/**
 * Check if project ownership can be transferred.
 *
 * Rules:
 * 1. Must be current owner OR org admin/owner
 * 2. Cannot transfer to self
 * 3. New owner must be an approved org member
 */
export function canTransferProjectOwnership(ctx: ProjectOwnershipTransferContext): PolicyResult {
  const isOwner = isSameId(ctx.actorId, ctx.projectOwnerId)
  const isOrgAdmin = isOrgOwnerOrAdmin(ctx.actorOrgRole)

  if (!isOwner && !isOrgAdmin) {
    return PR.deny('Chỉ owner hiện tại hoặc org_admin mới có thể transfer ownership')
  }

  if (isSameId(ctx.actorId, ctx.newOwnerId)) {
    return PR.deny('Không thể transfer ownership cho chính mình', 'BUSINESS_RULE')
  }

  if (!ctx.isNewOwnerOrgMember) {
    return PR.deny('Owner mới phải là member của organization', 'BUSINESS_RULE')
  }

  return PR.allow()
}
