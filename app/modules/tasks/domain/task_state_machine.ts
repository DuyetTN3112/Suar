/**
 * Task State Machine — Pure state transition validation.
 *
 * Based on the state diagram: docs/diagram/State/state_01_task.mmd
 *
 * v4 (Phase 4): Provides BOTH the legacy hard-coded transitions
 * AND a new DB-driven function (validateWorkflowTransition in task_status_rules.ts).
 *
 * Legacy allowed transitions (kept for backward compatibility):
 *   todo        → in_progress, cancelled
 *   in_progress → todo, in_review, cancelled
 *   in_review   → in_progress, done, cancelled
 *   done        → (terminal, no transitions)
 *   cancelled   → todo (reopen)
 *
 * Business rules:
 *   - todo → in_progress requires task to have an assignee
 *   - done is a terminal state
 *
 * All functions are synchronous, pure, and have 0 database dependencies.
 *
 * @module TaskStateMachine
 * @deprecated Phase 4: Use validateWorkflowTransition() from task_status_rules.ts
 *             for DB-driven transitions. This module is kept for migration period.
 */

import type { PolicyResult } from '#modules/policies/domain/policy_result'
import { PolicyResult as PR } from '#modules/policies/domain/policy_result'

const LEGACY_TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
  CANCELLED: 'cancelled',
  IN_REVIEW: 'in_review',
} as const

/**
 * Allowed state transitions map.
 * Key = current status, Value = array of valid next statuses.
 */
const ALLOWED_TRANSITIONS: Record<string, readonly string[]> = {
  [LEGACY_TASK_STATUS.TODO]: [LEGACY_TASK_STATUS.IN_PROGRESS, LEGACY_TASK_STATUS.CANCELLED],
  [LEGACY_TASK_STATUS.IN_PROGRESS]: [
    LEGACY_TASK_STATUS.TODO,
    LEGACY_TASK_STATUS.IN_REVIEW,
    LEGACY_TASK_STATUS.CANCELLED,
  ],
  [LEGACY_TASK_STATUS.IN_REVIEW]: [
    LEGACY_TASK_STATUS.IN_PROGRESS,
    LEGACY_TASK_STATUS.DONE,
    LEGACY_TASK_STATUS.CANCELLED,
  ],
  [LEGACY_TASK_STATUS.DONE]: [],
  [LEGACY_TASK_STATUS.CANCELLED]: [LEGACY_TASK_STATUS.TODO],
}

/**
 * Context needed for state transition validation.
 */
export interface TransitionContext {
  currentStatus: string
  newStatus: string
  /** Whether the task has an assignee (assigned_to !== null) */
  isAssigned: boolean
}

/**
 * Validate a task status transition.
 *
 * @returns PolicyResult — allow if transition is valid, deny with reason if not
 */
export function validateTransition(ctx: TransitionContext): PolicyResult {
  const { currentStatus, newStatus } = ctx

  // Same status → no-op, allow
  if (currentStatus === newStatus) return PR.allow()

  // Check if current status is known
  const allowed = ALLOWED_TRANSITIONS[currentStatus]
  if (!allowed) {
    return PR.deny(`Trạng thái hiện tại không hợp lệ: '${currentStatus}'`, 'INVALID_STATE')
  }

  // Check if transition is allowed
  if (!allowed.includes(newStatus)) {
    const allowedStr = allowed.length > 0 ? allowed.join(', ') : 'không có (trạng thái kết thúc)'
    return PR.deny(
      `Không thể chuyển từ '${currentStatus}' sang '${newStatus}'. Cho phép: ${allowedStr}`,
      'INVALID_STATE'
    )
  }

  // Pre-condition: todo → in_progress requires assignment
  if (currentStatus === LEGACY_TASK_STATUS.TODO && newStatus === LEGACY_TASK_STATUS.IN_PROGRESS) {
    if (!ctx.isAssigned) {
      return PR.deny(
        'Task phải được giao cho ai đó trước khi chuyển sang in_progress',
        'BUSINESS_RULE'
      )
    }
  }

  return PR.allow()
}

/**
 * Check if a status is terminal (done or cancelled).
 */
export function isTerminalStatus(status: string): boolean {
  return status === LEGACY_TASK_STATUS.DONE || status === LEGACY_TASK_STATUS.CANCELLED
}

/**
 * Get the list of allowed next statuses from the current status.
 * Returns empty array for terminal states or unknown statuses.
 */
export function getAllowedTransitions(currentStatus: string): readonly string[] {
  return ALLOWED_TRANSITIONS[currentStatus] ?? []
}
