/**
 * Project Permission Policy — Pure permission decision functions.
 *
 * All functions are synchronous, pure, and have 0 database dependencies.
 * They take pre-fetched data via context interfaces and return PolicyResult.
 *
 * Commands are responsible for:
 * 1. FETCH — Load project + user context from DB (via Fat Models)
 * 2. DECIDE — Call these pure functions with fetched data
 * 3. PERSIST — Save changes via Lucid ORM
 *
 * @module ProjectPermissionPolicy
 */

import { ProjectRole } from '../../public_contracts/project_constants.js'

import type {
  ProjectPermissionContext,
  ProjectOwnershipTransferContext,
  ProjectDeletionContext,
  ProjectMemberAddContext,
  ProjectMemberRemovalContext,
  ProjectUpdateFieldsResult,
  ProjectWorkspaceAccessContext,
} from '../project-context/project_types.js'
import { ProjectOrgRole } from './role_contracts.js'

import type { PolicyResult } from '#modules/authorization/public_contracts/policy_result'
import { PolicyResult as PR } from '#modules/authorization/public_contracts/policy_result'

const isSameId = (a: string, b: string): boolean => a === b

// ============================================================================
// Shared helpers (private)
// ============================================================================

function isOrgOwnerOrAdmin(orgRole: string | null): boolean {
  return orgRole === ProjectOrgRole.OWNER || orgRole === ProjectOrgRole.ADMIN
}

function canManageProject(ctx: ProjectPermissionContext): boolean {
  if (isSameId(ctx.projectOwnerId, ctx.actorId)) return true
  if (isSameId(ctx.projectCreatorId, ctx.actorId)) return true
  if (isOrgOwnerOrAdmin(ctx.actorOrgRole)) return true
  return false
}

// ============================================================================
// Permission Policies
// ============================================================================

/**
 * Check if actor can create a project in an organization.
 *
 * Rules:
 * 1. Org admin/owner → allow
 * 2. Others → deny
 */
export function canCreateProject(ctx: {
  isOrgAdminOrOwner: boolean
}): PolicyResult {
  if (ctx.isOrgAdminOrOwner) return PR.allow()

  return PR.deny('Chỉ org_admin và org_owner mới có thể tạo project')
}

/**
 * Check whether a project can be accessed from the current organization scope.
 */
export function canAccessProjectOrganizationScope(ctx: {
  requestedOrganizationId: string | null
  projectOrganizationId: string
}): PolicyResult {
  if (!ctx.requestedOrganizationId) return PR.allow()
  if (isSameId(ctx.requestedOrganizationId, ctx.projectOrganizationId)) return PR.allow()

  return PR.deny('Bạn không có quyền truy cập dự án ngoài tổ chức hiện tại')
}

/**
 * Check whether actor may enter the shared Project Workspace.
 *
 * Entering the workspace exposes project-wide boards, so mere membership is
 * insufficient. Organization roles need `can_view_all_projects`; project roles
 * need `can_view_all_tasks`. Project stakeholders remain allowed even if legacy
 * data is missing the corresponding project_members row.
 */
export function canEnterProjectWorkspace(
  ctx: ProjectWorkspaceAccessContext
): PolicyResult {
  if (ctx.actorHasOrganizationProjectAccess) return PR.allow()
  if (isSameId(ctx.actorId, ctx.projectOwnerId ?? '')) return PR.allow()
  if (isSameId(ctx.actorId, ctx.projectManagerId ?? '')) return PR.allow()
  if (isSameId(ctx.actorId, ctx.projectCreatorId ?? '')) return PR.allow()
  if (
    ctx.actorProjectRole === ProjectRole.OWNER ||
    ctx.actorProjectRole === ProjectRole.MANAGER ||
    ctx.actorProjectRole === ProjectRole.VIEWER
  ) {
    return PR.allow()
  }

  return PR.deny('Bạn không có quyền truy cập không gian dự án dùng chung')
}

/**
 * Check whether actor can view project members.
 */
export function canViewProjectMembers(ctx: { hasProjectAccess: boolean }): PolicyResult {
  if (ctx.hasProjectAccess) return PR.allow()

  return PR.deny('Bạn không có quyền xem danh sách thành viên của dự án này')
}

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

/**
 * Check if actor can view a project.
 *
 * Priority:
 * 1. Project owner/creator → allow
 * 2. Org owner/admin → allow
 * 3. Project member (any role) → allow
 * 4. Deny
 */
export function canViewProject(ctx: ProjectPermissionContext): PolicyResult {
  if (isSameId(ctx.projectOwnerId, ctx.actorId)) return PR.allow()
  if (isSameId(ctx.projectCreatorId, ctx.actorId)) return PR.allow()
  if (isOrgOwnerOrAdmin(ctx.actorOrgRole)) return PR.allow()
  if (ctx.actorProjectRole !== null) return PR.allow()

  return PR.deny('Bạn không có quyền xem dự án này')
}

/**
 * Check if actor can view a project's basic preview information.
 *
 * Preview access is broader than internal detail access:
 * - Any internal viewer can also view preview
 * - Organization members can view the basic introduction/info card
 * - Non-members outside the organization stay denied
 */
export function canViewProjectPreview(ctx: ProjectPermissionContext): PolicyResult {
  if (canViewProject(ctx).allowed) return PR.allow()
  if (ctx.actorOrgRole !== null) return PR.allow()

  return PR.deny('Bạn không có quyền xem thông tin sơ lược của dự án này')
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
