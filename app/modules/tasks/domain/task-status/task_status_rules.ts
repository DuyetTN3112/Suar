/**
 * Task Status Rules — Pure business rule validation for task status CRUD.
 *
 * All functions are synchronous, pure, and have 0 database dependencies.
 * Commands map PolicyResult → exceptions via enforcePolicy().
 *
 * @module TaskStatusRules
 */

import type { PolicyResult } from '#modules/authorization/public_contracts/policy_result'
import { PolicyResult as PR } from '#modules/authorization/public_contracts/policy_result'
import {
  DOCUMENTATION_TASK_STATUS_SLUG,
  TaskStatusCategory,
} from '#modules/tasks/public_contracts/task_constants'

export interface TaskStatusIdentity {
  slug: string
  category: string
}

export function isDocumentationTaskStatus(
  status: TaskStatusIdentity | null | undefined
): boolean {
  // The slug fallback keeps historical Docs rows safe until their database
  // migration has reclassified them into the Docs group.
  return (
    status?.category === TaskStatusCategory.DOCS ||
    status?.slug === DOCUMENTATION_TASK_STATUS_SLUG
  )
}

/** A Docs item is a living board resource, never a unit of assigned work. */
export function canAssignTaskInStatus(
  status: TaskStatusIdentity | null | undefined
): PolicyResult {
  if (isDocumentationTaskStatus(status)) {
    return PR.deny(
      'Mục Docs chỉ dùng để lưu thông tin chung của dự án và không được giao cho bất kỳ ai.',
      'BUSINESS_RULE'
    )
  }

  return PR.allow()
}

/**
 * Docs is created as a living information item.  It may not enter the
 * publish flow that establishes a work contract and review lifecycle.
 */
export function canCreateTaskInStatus(
  status: TaskStatusIdentity | null | undefined,
  input: {
    assigneeId?: string | null
    authoringIntent?: 'save_draft' | 'publish'
  }
): PolicyResult {
  if (!isDocumentationTaskStatus(status)) {
    return PR.allow()
  }

  const assignmentPolicy = canAssignTaskInStatus(status)
  if (input.assigneeId && !assignmentPolicy.allowed) {
    return assignmentPolicy
  }

  if (input.authoringIntent === 'publish') {
    return PR.deny(
      'Mục Docs chỉ để lưu thông tin chung và không thể đi vào quy trình công việc.',
      'BUSINESS_RULE'
    )
  }

  return PR.allow()
}

/** A Docs item is a permanent board resource, not a workflow step. */
export function validateDocumentationTaskStatusTransition(ctx: {
  currentStatus: TaskStatusIdentity
  nextStatus: TaskStatusIdentity
  isAssigned: boolean
}): PolicyResult {
  if (!isDocumentationTaskStatus(ctx.currentStatus) && isDocumentationTaskStatus(ctx.nextStatus)) {
    return PR.deny(
      'Không thể chuyển công việc sang Docs. Docs phải được tạo trực tiếp để lưu thông tin chung của dự án.',
      'BUSINESS_RULE'
    )
  }

  if (isDocumentationTaskStatus(ctx.currentStatus) && !isDocumentationTaskStatus(ctx.nextStatus)) {
    return PR.deny(
      'Mục Docs là mục thông tin cố định trên board và không thể chuyển sang trạng thái công việc.',
      'BUSINESS_RULE'
    )
  }

  return PR.allow()
}
// ============================================================================
// canEditStatus — Check if a status can be modified
// ============================================================================

interface EditStatusContext {
  isSystem: boolean
  /** Fields being changed */
  changingCategory: boolean
}

/**
 * System statuses cannot have their category changed.
 * Other fields (name, color, icon, description, sort_order) are editable.
 */
export function canEditStatus(ctx: EditStatusContext): PolicyResult {
  if (ctx.isSystem && ctx.changingCategory) {
    return PR.deny('Không thể thay đổi category của trạng thái hệ thống', 'BUSINESS_RULE')
  }
  return PR.allow()
}

// ============================================================================
// canDeleteStatus — Check if a status can be deleted
// ============================================================================

interface DeleteStatusContext {
  isSystem: boolean
  taskCount: number
}

/**
 * System statuses cannot be deleted.
 * Statuses with tasks assigned cannot be deleted.
 */
export function canDeleteStatus(ctx: DeleteStatusContext): PolicyResult {
  if (ctx.isSystem) {
    return PR.deny('Không thể xóa trạng thái hệ thống', 'BUSINESS_RULE')
  }
  if (ctx.taskCount > 0) {
    return PR.deny(
      `Không thể xóa trạng thái đang được sử dụng bởi ${ctx.taskCount} tasks`,
      'BUSINESS_RULE'
    )
  }
  return PR.allow()
}

// ============================================================================
// validateWorkflowTransition — Pure validation for DB-driven transitions
// ============================================================================

export interface WorkflowTransitionContext {
  currentStatusId: string
  newStatusId: string
  /** Allowed to_status_ids from the current status */
  allowedTargetIds: string[]
  /** Whether the organization has any workflow transitions configured */
  workflowConfigured: boolean
  /** Conditions from the matching transition */
  conditions: Record<string, unknown>
  /** Whether the task has an assignee */
  isAssigned: boolean
}

/**
 * Validate a task status transition against the workflow configuration.
 * Replaces the hard-coded ALLOWED_TRANSITIONS map.
 *
 * If no workflow transitions are configured for the organization,
 * all transitions are allowed — this is the permissive default so that drag-and-drop
 * works out of the box without requiring explicit workflow setup.
 */
export function validateWorkflowTransition(ctx: WorkflowTransitionContext): PolicyResult {
  // Same status → no-op, allow
  if (ctx.currentStatusId === ctx.newStatusId) return PR.allow()

  if (!ctx.workflowConfigured) return PR.allow()

  // Check if transition is allowed
  if (!ctx.allowedTargetIds.includes(ctx.newStatusId)) {
    return PR.deny('Chuyển trạng thái không được phép trong workflow hiện tại', 'INVALID_STATE')
  }

  // Check conditions
  if (ctx.conditions['requires_assignee'] === true && !ctx.isAssigned) {
    return PR.deny(
      'Task phải được giao cho ai đó trước khi chuyển sang trạng thái này',
      'BUSINESS_RULE'
    )
  }

  return PR.allow()
}
