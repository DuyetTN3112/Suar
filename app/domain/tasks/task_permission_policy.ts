/**
 * Task Permission Policy — Pure permission decision functions.
 *
 * All functions are synchronous, pure, and have 0 database dependencies.
 * They take pre-fetched data via TaskPermissionContext and return PolicyResult.
 *
 * Commands are responsible for:
 * 1. FETCH — Load task + user context from DB (via Fat Models)
 * 2. DECIDE — Call these pure functions with fetched data
 * 3. PERSIST — Save changes via Lucid ORM
 *
 * @module TaskPermissionPolicy
 */

import type {
  TaskCollectionAccessContext,
  TaskCollectionReadScope,
  TaskCreatePermissionContext,
  TaskPermissionContext,
  UpdateFieldsResult,
} from './task_types.js'
import type { PolicyResult } from '#domain/shared/policy_result'
import { PolicyResult as PR } from '#domain/shared/policy_result'
import { SystemRoleName } from '#constants/user_constants'
import { OrganizationRole } from '#constants/organization_constants'
import { ProjectRole } from '#constants/project_constants'
import { isSameId } from '#domain/shared/id_utils'

// ============================================================================
// Shared helpers (private)
// ============================================================================

function isSystemAdmin(systemRole: string | null): boolean {
  return systemRole === SystemRoleName.SUPERADMIN || systemRole === SystemRoleName.SYSTEM_ADMIN
}

function isOrgOwnerOrAdmin(orgRole: string | null): boolean {
  return orgRole === OrganizationRole.OWNER || orgRole === OrganizationRole.ADMIN
}

function isProjectManagerOrOwner(projectRole: string | null): boolean {
  return projectRole === ProjectRole.OWNER || projectRole === ProjectRole.MANAGER
}

// ============================================================================
// Permission Policies
// ============================================================================

/**
 * Check if actor can update a task (general fields).
 *
 * Priority:
 * 1. System admin/superadmin → allow
 * 2. Task creator → allow
 * 3. Task assignee → allow
 * 4. Active assignee (from task_assignments) → allow
 * 5. Org owner/admin → allow
 * 6. Project manager/owner → allow
 * 7. Deny
 */
export function canUpdateTask(ctx: TaskPermissionContext): PolicyResult {
  if (isSystemAdmin(ctx.actorSystemRole)) return PR.allow()
  if (isSameId(ctx.taskCreatorId, ctx.actorId)) return PR.allow()
  if (ctx.taskAssignedTo !== null && isSameId(ctx.taskAssignedTo, ctx.actorId)) return PR.allow()
  if (ctx.isActiveAssignee) return PR.allow()
  if (isOrgOwnerOrAdmin(ctx.actorOrgRole)) return PR.allow()
  if (isProjectManagerOrOwner(ctx.actorProjectRole)) return PR.allow()

  return PR.deny('Bạn không có quyền cập nhật task này')
}

/**
 * Check if actor can update task status.
 * Same rules as canUpdateTask.
 */
export function canUpdateTaskStatus(ctx: TaskPermissionContext): PolicyResult {
  return canUpdateTask(ctx)
}

/**
 * Check if actor can update task time tracking.
 * Same rules as canUpdateTask.
 */
export function canUpdateTaskTime(ctx: TaskPermissionContext): PolicyResult {
  return canUpdateTask(ctx)
}

/**
 * Check if actor can assign/reassign/unassign a task.
 *
 * Priority:
 * 1. System admin/superadmin → allow
 * 2. Task creator → allow
 * 3. Current assignee (can reassign or unassign) → allow
 * 4. Org owner/admin → allow
 * 5. Project manager/owner → allow
 * 6. Deny
 */
export function canAssignTask(ctx: TaskPermissionContext): PolicyResult {
  if (isSystemAdmin(ctx.actorSystemRole)) return PR.allow()
  if (isSameId(ctx.taskCreatorId, ctx.actorId)) return PR.allow()
  if (ctx.taskAssignedTo !== null && isSameId(ctx.taskAssignedTo, ctx.actorId)) return PR.allow()
  if (isOrgOwnerOrAdmin(ctx.actorOrgRole)) return PR.allow()
  if (isProjectManagerOrOwner(ctx.actorProjectRole)) return PR.allow()

  return PR.deny('Bạn không có quyền giao task này')
}

/**
 * Check if actor can delete a task.
 *
 * Admin/superadmin must also be an org member to delete.
 *
 * Priority:
 * 1. System admin/superadmin (must be org member) → allow
 * 2. Task creator → allow
 * 3. Org owner/admin → allow
 * 4. Deny
 */
export function canDeleteTask(
  ctx: TaskPermissionContext & { isActorOrgMember: boolean }
): PolicyResult {
  if (isSystemAdmin(ctx.actorSystemRole)) {
    if (!ctx.isActorOrgMember) {
      return PR.deny('Admin/Superadmin phải thuộc tổ chức của task để xóa')
    }
    return PR.allow()
  }
  if (isSameId(ctx.taskCreatorId, ctx.actorId)) return PR.allow()
  if (isOrgOwnerOrAdmin(ctx.actorOrgRole)) return PR.allow()

  return PR.deny('Bạn không có quyền xoá task này')
}

/**
 * Check if actor can revoke task access (unassign + remove from task-related resources).
 *
 * Priority:
 * 1. System admin/superadmin → allow
 * 2. Task creator → allow
 * 3. Org owner/admin → allow
 * 4. Project manager/owner → allow
 * 5. Deny
 */
export function canRevokeTaskAccess(ctx: TaskPermissionContext): PolicyResult {
  if (isSystemAdmin(ctx.actorSystemRole)) return PR.allow()
  if (isSameId(ctx.taskCreatorId, ctx.actorId)) return PR.allow()
  if (isOrgOwnerOrAdmin(ctx.actorOrgRole)) return PR.allow()
  if (isProjectManagerOrOwner(ctx.actorProjectRole)) return PR.allow()

  return PR.deny('Bạn không có quyền thu hồi quyền truy cập task này')
}

/**
 * Check if actor can update task fields, with field-level restrictions.
 *
 * Org owner/admin who are NOT the creator or assignee can only update
 * a restricted set of fields: description, status, due_date, estimated_time.
 *
 * @param ctx - Permission context
 * @param requestedFields - List of field names the actor wants to update
 */
export function canUpdateTaskFields(
  ctx: TaskPermissionContext,
  requestedFields: string[]
): UpdateFieldsResult {
  // System admin — no restrictions
  if (isSystemAdmin(ctx.actorSystemRole)) {
    return { allowed: true, fieldRestrictions: null }
  }

  // Creator — no restrictions
  if (isSameId(ctx.taskCreatorId, ctx.actorId)) {
    return { allowed: true, fieldRestrictions: null }
  }

  // Assignee — no restrictions
  if (ctx.taskAssignedTo !== null && isSameId(ctx.taskAssignedTo, ctx.actorId)) {
    return { allowed: true, fieldRestrictions: null }
  }

  // Active assignee — no restrictions
  if (ctx.isActiveAssignee) {
    return { allowed: true, fieldRestrictions: null }
  }

  // Org owner/admin — restricted fields only
  if (isOrgOwnerOrAdmin(ctx.actorOrgRole)) {
    const allowedFields = ['description', 'status', 'due_date', 'estimated_time'] as const
    const disallowed = requestedFields.filter(
      (f) => !allowedFields.includes(f as (typeof allowedFields)[number])
    )
    if (disallowed.length > 0) {
      return {
        allowed: false,
        reason: `Org admin/owner không được phép cập nhật các fields: ${disallowed.join(', ')}`,
        code: 'FORBIDDEN',
      }
    }
    return { allowed: true, fieldRestrictions: allowedFields }
  }

  // Project manager/owner — no restrictions (they manage the project)
  if (isProjectManagerOrOwner(ctx.actorProjectRole)) {
    return { allowed: true, fieldRestrictions: null }
  }

  return {
    allowed: false,
    reason: 'Bạn không có quyền cập nhật task này',
    code: 'FORBIDDEN',
  }
}

/**
 * Check if actor can permanently (hard) delete a task.
 *
 * Only system admins can hard-delete.
 */
export function canPermanentDeleteTask(ctx: { actorSystemRole: string | null }): PolicyResult {
  if (isSystemAdmin(ctx.actorSystemRole)) return PR.allow()
  return PR.deny('Chỉ Superadmin mới có quyền xóa vĩnh viễn nhiệm vụ')
}

/**
 * Check if actor can view a task's details.
 *
 * Priority:
 * 1. System admin/superadmin → allow
 * 2. Task creator → allow
 * 3. Task assignee → allow
 * 4. Active assignee (from task_assignments) → allow
 * 5. Org owner/admin → allow
 * 6. Project manager/owner → allow
 * 7. Deny
 */
export function canViewTask(ctx: TaskPermissionContext): PolicyResult {
  if (isSystemAdmin(ctx.actorSystemRole)) return PR.allow()
  if (isSameId(ctx.taskCreatorId, ctx.actorId)) return PR.allow()
  if (ctx.taskAssignedTo !== null && isSameId(ctx.taskAssignedTo, ctx.actorId)) return PR.allow()
  if (ctx.isActiveAssignee) return PR.allow()
  if (isOrgOwnerOrAdmin(ctx.actorOrgRole)) return PR.allow()
  if (isProjectManagerOrOwner(ctx.actorProjectRole)) return PR.allow()

  return PR.deny('Bạn không có quyền xem task này')
}

export function canReorderTask(ctx: { actorOrgRole: string | null }): PolicyResult {
  if (ctx.actorOrgRole) return PR.allow()

  return PR.deny('Bạn không có quyền sắp xếp task trong tổ chức này')
}

export function resolveTaskCollectionReadScope(
  ctx: TaskCollectionAccessContext
): TaskCollectionReadScope {
  if (isSystemAdmin(ctx.actorSystemRole)) {
    return { type: 'all' }
  }

  if (isOrgOwnerOrAdmin(ctx.actorOrgRole)) {
    return { type: 'all' }
  }

  if (!ctx.actorOrgRole) {
    return ctx.unaffiliatedScope === 'own_only'
      ? { type: 'own_only', actorId: ctx.actorId }
      : { type: 'none' }
  }

  return { type: 'own_or_assigned', actorId: ctx.actorId }
}

/**
 * Calculate the set of permissions an actor has on a task.
 *
 * Returns a flat permissions object for the frontend.
 */
export function calculateTaskPermissions(ctx: TaskPermissionContext): {
  isCreator: boolean
  isAssignee: boolean
  canEdit: boolean
  canDelete: boolean
  canAssign: boolean
} {
  const isCreator = isSameId(ctx.taskCreatorId, ctx.actorId)
  const isAssignee = ctx.taskAssignedTo !== null && isSameId(ctx.taskAssignedTo, ctx.actorId)

  const canEdit = canUpdateTask(ctx).allowed
  const canDelete = canDeleteTask({
    ...ctx,
    isActorOrgMember: ctx.actorOrgRole !== null,
  }).allowed
  const canAssign = canAssignTask(ctx).allowed

  return { isCreator, isAssignee, canEdit, canDelete, canAssign }
}

/**
 * Check if actor can create a task in an organization.
 *
 * Rules:
 * 0. Superadmin → always allowed
 * 1. Org admin/owner → always allowed
 * 2. Project manager/owner (when project is provided) → allowed
 * 3. Regular members → denied
 */
export function canCreateTask(ctx: TaskCreatePermissionContext): PolicyResult {
  if (isSystemAdmin(ctx.actorSystemRole)) return PR.allow()
  if (isOrgOwnerOrAdmin(ctx.actorOrgRole)) return PR.allow()
  if (ctx.projectId && isProjectManagerOrOwner(ctx.actorProjectRole)) return PR.allow()

  return PR.deny(
    'Chỉ org_admin, org_owner hoặc project_manager mới có thể tạo task. org_member không có quyền này.'
  )
}

export function canManageTaskStatusBoard(ctx: TaskCollectionAccessContext): PolicyResult {
  if (isOrgOwnerOrAdmin(ctx.actorOrgRole)) return PR.allow()

  return PR.deny('Only organization owners/admins can run this mutation')
}
