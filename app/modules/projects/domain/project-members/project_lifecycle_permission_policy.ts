import type {
  ProjectDeletionContext,
  ProjectOwnershipTransferContext,
  ProjectPermissionContext,
  ProjectUpdateFieldsResult,
} from '../project-context/project_types.js'

import {
  canManageProject,
  canManageProjectMembers,
  isOrgOwnerOrAdmin,
  isSameId,
  ProjectRole,
} from './project_permission_helpers.js'

import type { PolicyResult } from '#modules/authorization/public_contracts/policy_result'
import { PolicyResult as PR } from '#modules/authorization/public_contracts/policy_result'

/**
 * Check if actor can update a project (general fields).
 *
 * Priority:
 * 1. Project owner → allow
 * 2. Project creator → allow
 * 3. Org owner/admin → allow
 * 4. Project manager → allow (with field restrictions)
 * 5. Deny
 */
export function canUpdateProject(ctx: ProjectPermissionContext): PolicyResult {
  if (canManageProject(ctx)) return PR.allow()
  if (ctx.actorProjectRole === ProjectRole.MANAGER) return PR.allow()

  return PR.deny('Bạn không có quyền cập nhật dự án này')
}

/**
 * Check if actor can update project fields, with field-level restrictions.
 *
 * Managers can only update: description, start_date, end_date, status.
 * Others with manage permission have no restrictions.
 */
export function canUpdateProjectFields(
  ctx: ProjectPermissionContext,
  requestedFields: string[]
): ProjectUpdateFieldsResult {
  // Owners, creators and org admins — no restrictions
  if (canManageProject(ctx)) {
    return { allowed: true, fieldRestrictions: null }
  }

  // Project manager — restricted fields only
  if (ctx.actorProjectRole === ProjectRole.MANAGER) {
    const allowedFields = [
      'description',
      'start_date',
      'end_date',
      'status',
      'business_domains',
    ] as const
    const disallowed = requestedFields.filter(
      (f) => !allowedFields.includes(f as (typeof allowedFields)[number])
    )
    if (disallowed.length > 0) {
      return {
        allowed: false,
        reason: `Manager chỉ có thể cập nhật: ${allowedFields.join(', ')}. Không được phép cập nhật: ${disallowed.join(', ')}`,
        code: 'FORBIDDEN',
      }
    }
    return { allowed: true, fieldRestrictions: allowedFields }
  }

  return {
    allowed: false,
    reason: 'Bạn không có quyền cập nhật dự án này',
    code: 'FORBIDDEN',
  }
}

/**
 * Check if actor can delete a project.
 *
 * Rules:
 * 1. Project owner → allow (if no incomplete tasks)
 * 2. Org owner/admin → allow (if no incomplete tasks)
 * 3. Incomplete tasks → deny (business rule)
 * 4. Others → deny
 */
export function canDeleteProject(ctx: ProjectDeletionContext): PolicyResult {
  const hasPermission =
    isSameId(ctx.projectOwnerId, ctx.actorId) ||
    isOrgOwnerOrAdmin(ctx.actorOrgRole)

  if (!hasPermission) {
    return PR.deny('Chỉ owner hoặc admin mới có thể xóa dự án')
  }

  if (ctx.incompleteTaskCount > 0) {
    return PR.deny(
      `Dự án có ${ctx.incompleteTaskCount} công việc chưa hoàn thành. Vui lòng hoàn thành hoặc hủy các công việc trước khi xóa dự án.`,
      'BUSINESS_RULE'
    )
  }

  if (ctx.pendingReviewSessionCount > 0) {
    return PR.deny(
      `Dự án có ${ctx.pendingReviewSessionCount} review session đang chờ xử lý. Vui lòng hoàn tất review trước khi xóa dự án.`,
      'BUSINESS_RULE'
    )
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

/**
 * Calculate the set of permissions an actor has on a project.
 *
 * Returns a flat permissions object for the frontend.
 */
export function calculateProjectPermissions(ctx: ProjectPermissionContext): {
  isOwner: boolean
  isCreator: boolean
  canEdit: boolean
  canDelete: boolean
  canManageMembers: boolean
  canTransferOwnership: boolean
} {
  const isOwner = isSameId(ctx.projectOwnerId, ctx.actorId)
  const isCreator = isSameId(ctx.projectCreatorId, ctx.actorId)

  const canEdit = canUpdateProject(ctx).allowed
  const canDeleteResult = canDeleteProject({
    actorId: ctx.actorId,
    actorOrgRole: ctx.actorOrgRole,
    projectOwnerId: ctx.projectOwnerId,
    projectCreatorId: ctx.projectCreatorId,
    incompleteTaskCount: 0,
    pendingReviewSessionCount: 0,
  }).allowed
  const canManageMembersResult = canManageProjectMembers(ctx).allowed
  const canTransfer = canTransferProjectOwnership({
    actorId: ctx.actorId,
    actorOrgRole: ctx.actorOrgRole,
    projectOwnerId: ctx.projectOwnerId,
    newOwnerId: '',
    isNewOwnerOrgMember: true,
  }).allowed

  return {
    isOwner,
    isCreator,
    canEdit,
    canDelete: canDeleteResult,
    canManageMembers: canManageMembersResult,
    canTransferOwnership: canTransfer,
  }
}

/**
 * Calculate the detail-page permissions for a project.
 *
 * This shape matches the current project detail UI contract.
 */
export function calculateProjectDetailPermissions(
  ctx: ProjectPermissionContext & { projectManagerId: string | null }
): {
  isOwner: boolean
  isManager: boolean
  isCreator: boolean
  isMember: boolean
  canEdit: boolean
  canDelete: boolean
  canAddMembers: boolean
} {
  const isOwner = isSameId(ctx.projectOwnerId, ctx.actorId)
  const isManager = ctx.projectManagerId !== null && isSameId(ctx.projectManagerId, ctx.actorId)
  const isCreator = isSameId(ctx.projectCreatorId, ctx.actorId)
  const isMember = ctx.actorProjectRole !== null

  return {
    isOwner,
    isManager,
    isCreator,
    isMember,
    canEdit: canUpdateProject(ctx).allowed,
    canDelete: canDeleteProject({
      actorId: ctx.actorId,
      actorOrgRole: ctx.actorOrgRole,
      projectOwnerId: ctx.projectOwnerId,
      projectCreatorId: ctx.projectCreatorId,
      incompleteTaskCount: 0,
      pendingReviewSessionCount: 0,
    }).allowed,
    canAddMembers: canManageProjectMembers(ctx).allowed,
  }
}
