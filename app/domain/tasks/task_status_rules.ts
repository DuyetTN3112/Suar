/**
 * Task Status Rules — Pure business rule validation for task status CRUD.
 *
 * All functions are synchronous, pure, and have 0 database dependencies.
 * Commands map PolicyResult → exceptions via enforcePolicy().
 *
 * @module TaskStatusRules
 */

import { TaskStatusCategory } from '#constants/task_constants'
import type { PolicyResult } from '#domain/shared/policy_result'
import { PolicyResult as PR } from '#domain/shared/policy_result'

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
// validateStatusSlug — Check slug format
// ============================================================================

const SLUG_PATTERN = /^[a-z0-9_]+$/

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug) && slug.length >= 2 && slug.length <= 50
}

// ============================================================================
// validateStatusCategory — Check category is valid
// ============================================================================

export function isValidCategory(category: string): boolean {
  return (Object.values(TaskStatusCategory) as string[]).includes(category)
}

// ============================================================================
// validateWorkflowTransition — Pure validation for DB-driven transitions
// ============================================================================

export interface WorkflowTransitionContext {
  currentStatusId: string
  newStatusId: string
  /** Allowed to_status_ids from the current status */
  allowedTargetIds: string[]
  /** Conditions from the matching transition */
  conditions: Record<string, unknown>
  /** Whether the task has an assignee */
  isAssigned: boolean
}

/**
 * Validate a task status transition against the workflow configuration.
 * Replaces the hard-coded ALLOWED_TRANSITIONS map.
 */
export function validateWorkflowTransition(ctx: WorkflowTransitionContext): PolicyResult {
  // Same status → no-op, allow
  if (ctx.currentStatusId === ctx.newStatusId) return PR.allow()

  // Check if transition is allowed
  if (!ctx.allowedTargetIds.includes(ctx.newStatusId)) {
    return PR.deny('Chuyển trạng thái không được phép trong workflow hiện tại', 'INVALID_STATE')
  }

  // Check conditions
  if (ctx.conditions.requires_assignee === true && !ctx.isAssigned) {
    return PR.deny(
      'Task phải được giao cho ai đó trước khi chuyển sang trạng thái này',
      'BUSINESS_RULE'
    )
  }

  return PR.allow()
}
