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

import { TaskOrgRole, TaskProjectRole } from './role_contracts.js'
import type {
  TaskCollectionAccessContext,
  TaskCollectionReadScope,
  TaskCreatePermissionContext,
  TaskPermissionContext,
  UpdateFieldsResult,
} from './task_types.js'

import { PolicyResult as PR } from '#modules/authorization/public_contracts/policy_result'
import type { PolicyResult } from '#modules/authorization/public_contracts/policy_result'

const isSameId = (a: string, b: string): boolean => a === b
const PUBLIC_TASK_VISIBILITIES = new Set(['external', 'all'])

// ============================================================================
// Shared helpers (private)
// ============================================================================

function isOrgOwnerOrAdmin(orgRole: string | null): boolean {
  return orgRole === TaskOrgRole.OWNER || orgRole === TaskOrgRole.ADMIN
}

function isProjectManagerOrOwner(projectRole: string | null): boolean {
  return projectRole === TaskProjectRole.OWNER || projectRole === TaskProjectRole.MANAGER
}

// ============================================================================
// Permission Policies
// ============================================================================

/**
 * Check if actor can update a task (general fields).
 *
 * Priority:
 * 1. Task creator → allow
 * 2. Task assignee → allow
 * 3. Active assignee (from task_assignments) → allow
 * 4. Org owner/admin → allow
 * 5. Project manager/owner → allow
 * 6. Deny
 */
export function canUpdateTask(ctx: TaskPermissionContext): PolicyResult {
  if (isSameId(ctx.taskCreatorId, ctx.actorId)) return PR.allow()
  if (ctx.taskAssignedTo !== null && isSameId(ctx.taskAssignedTo, ctx.actorId)) return PR.allow()
  if (ctx.isActiveAssignee) return PR.allow()
  if (isOrgOwnerOrAdmin(ctx.actorOrgRole)) return PR.allow()
  if (isProjectManagerOrOwner(ctx.actorProjectRole)) return PR.allow()
  if (ctx.actorProjectRole === TaskProjectRole.MEMBER) return PR.allow()

  return PR.deny('Bạn không có quyền cập nhật task này')
}

/**
 * Check if actor can update task status.
 * Project membership owns status movement. Org membership alone is not enough.
 */
export function canUpdateTaskStatus(ctx: TaskPermissionContext): PolicyResult {
  if (ctx.actorProjectRole) return PR.allow()
  if (ctx.isActiveAssignee) return PR.allow()

  return PR.deny('Bạn không có quyền cập nhật trạng thái task này')
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
 * 1. Task creator → allow
 * 2. Current assignee (can reassign or unassign) → allow
 * 3. Org owner/admin → allow
 * 4. Project manager/owner → allow
 * 5. Deny
 */
export function canAssignTask(ctx: TaskPermissionContext): PolicyResult {
  if (isSameId(ctx.taskCreatorId, ctx.actorId)) return PR.allow()
  if (ctx.taskAssignedTo !== null && isSameId(ctx.taskAssignedTo, ctx.actorId)) return PR.allow()
  if (isOrgOwnerOrAdmin(ctx.actorOrgRole)) return PR.allow()
  if (isProjectManagerOrOwner(ctx.actorProjectRole)) return PR.allow()

  return PR.deny('Bạn không có quyền giao task này')
}

/**
 * Check if actor can delete a task.
 *
 * Priority:
 * 1. Task creator → allow
 * 2. Org owner/admin → allow
 * 3. Project member → allow
 * 4. Deny
 */
export function canDeleteTask(
  ctx: TaskPermissionContext & { isActorOrgMember: boolean }
): PolicyResult {
  if (isSameId(ctx.taskCreatorId, ctx.actorId)) return PR.allow()
  if (isOrgOwnerOrAdmin(ctx.actorOrgRole)) return PR.allow()
  if (ctx.actorProjectRole === TaskProjectRole.MEMBER) return PR.allow()

  return PR.deny('Bạn không có quyền xoá task này')
}

/**
 * Check if actor can revoke task access (unassign + remove from task-related resources).
 *
 * Priority:
 * 1. Task creator → allow
 * 2. Org owner/admin → allow
 * 3. Project manager/owner → allow
 * 4. Deny
 */
export function canRevokeTaskAccess(ctx: TaskPermissionContext): PolicyResult {
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

  // Project member — no restrictions (they can edit tasks)
  if (ctx.actorProjectRole === TaskProjectRole.MEMBER) {
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
 * Hard deletion is not available from the User/Organization/Project realm.
 */
export function canPermanentDeleteTask(): PolicyResult {
  return PR.deny('Không hỗ trợ xóa vĩnh viễn nhiệm vụ trong workspace dự án')
}

/**
 * Check if actor can view a task's details.
 *
 * Priority:
 * 1. Task creator → allow
 * 2. Task assignee → allow
 * 3. Active assignee (from task_assignments) → allow
 * 4. Org owner/admin → allow
 * 5. Project manager/owner → allow
 * 6. Public marketplace task → allow read-only detail
 * 7. Deny
 */
export function canViewTask(ctx: TaskPermissionContext): PolicyResult {
  if (isSameId(ctx.taskCreatorId, ctx.actorId)) return PR.allow()
  if (ctx.taskAssignedTo !== null && isSameId(ctx.taskAssignedTo, ctx.actorId)) return PR.allow()
  if (ctx.isActiveAssignee) return PR.allow()
  if (isOrgOwnerOrAdmin(ctx.actorOrgRole)) return PR.allow()
  if (isProjectManagerOrOwner(ctx.actorProjectRole)) return PR.allow()
  if (
    ctx.actorProjectRole === TaskProjectRole.MEMBER ||
    ctx.actorProjectRole === TaskProjectRole.VIEWER
  )
    return PR.allow()
  if (ctx.taskVisibility && PUBLIC_TASK_VISIBILITIES.has(ctx.taskVisibility)) return PR.allow()

  return PR.deny('Bạn không có quyền xem task này')
}

/**
 * Task audit trails contain actor identities and field-level before/after
 * values. Marketplace visibility and read-only project roles are therefore
 * intentionally insufficient.
 */
export function canViewTaskAuditLogs(ctx: TaskPermissionContext): PolicyResult {
  if (isSameId(ctx.taskCreatorId, ctx.actorId)) return PR.allow()
  if (ctx.taskAssignedTo !== null && isSameId(ctx.taskAssignedTo, ctx.actorId)) return PR.allow()
  if (ctx.isActiveAssignee) return PR.allow()
  if (isOrgOwnerOrAdmin(ctx.actorOrgRole)) return PR.allow()
  if (isProjectManagerOrOwner(ctx.actorProjectRole)) return PR.allow()

  return PR.deny('Bạn không có quyền xem nhật ký thay đổi của task này')
}

export function canReorderTask(ctx: { actorOrgRole: string | null }): PolicyResult {
  if (ctx.actorOrgRole) return PR.allow()

  return PR.deny('Bạn không có quyền sắp xếp task trong tổ chức này')
}

export function resolveTaskCollectionReadScope(
  ctx: TaskCollectionAccessContext
): TaskCollectionReadScope {
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
  canChangeStatus: boolean
} {
  const isCreator = isSameId(ctx.taskCreatorId, ctx.actorId)
  const isAssignee = ctx.taskAssignedTo !== null && isSameId(ctx.taskAssignedTo, ctx.actorId)

  const canEdit = canUpdateTask(ctx).allowed
  const canDelete = canDeleteTask({
    ...ctx,
    isActorOrgMember: ctx.actorOrgRole !== null,
  }).allowed
  const canAssign = canAssignTask(ctx).allowed
  const canChangeStatus = canUpdateTaskStatus(ctx).allowed

  return { isCreator, isAssignee, canEdit, canDelete, canAssign, canChangeStatus }
}

/**
 * Check if actor can create a task in an organization.
 *
 * Rules:
 * 1. Org admin/owner → always allowed
 * 2. Project manager/owner/member (when project is provided) → allowed
 * 3. Others → denied
 */
export function canCreateTask(ctx: TaskCreatePermissionContext): PolicyResult {
  if (isOrgOwnerOrAdmin(ctx.actorOrgRole)) return PR.allow()
  if (
    ctx.projectId &&
    (isProjectManagerOrOwner(ctx.actorProjectRole) ||
      ctx.actorProjectRole === TaskProjectRole.MEMBER)
  )
    return PR.allow()

  return PR.deny(
    'Chỉ thành viên dự án, Quản lý dự án hoặc Chủ sở hữu/Quản trị viên tổ chức mới có thể tạo nhiệm vụ.'
  )
}

export function canManageTaskStatusBoard(ctx: TaskCollectionAccessContext): PolicyResult {
  if (isOrgOwnerOrAdmin(ctx.actorOrgRole)) return PR.allow()

  return PR.deny('Only organization owners/admins can run this mutation')
}

/**
 * Check whether actor can open task edit page from precomputed permissions.
 */
export function canAccessTaskEditPage(ctx: { canEdit: boolean }): PolicyResult {
  if (ctx.canEdit) return PR.allow()

  return PR.deny('Bạn không có quyền chỉnh sửa nhiệm vụ này')
}
