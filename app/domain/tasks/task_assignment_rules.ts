/**
 * Task Assignment Rules — Pure business rules for task applications and assignments.
 *
 * All functions are synchronous, pure, and have 0 database dependencies.
 *
 * @module TaskAssignmentRules
 */

import type { PolicyResult } from '#domain/shared/policy_result'
import { PolicyResult as PR } from '#domain/shared/policy_result'
import type { DatabaseId } from '#types/database'
import { isSameId } from '#libs/id_utils'
import {
  TaskVisibility,
  AssignmentStatus,
  TaskStatus,
  TaskLabel,
  TaskPriority,
} from '#constants/task_constants'

/**
 * Check if a user can apply for a task on the marketplace.
 *
 * Rules:
 * - Cannot apply to your own task
 * - Task must have external or all visibility
 * - Cannot apply if already applied (duplicate check)
 */
export function canApplyForTask(ctx: {
  actorId: DatabaseId
  taskCreatorId: DatabaseId
  taskVisibility: string
  hasExistingApplication: boolean
}): PolicyResult {
  if (isSameId(ctx.actorId, ctx.taskCreatorId)) {
    return PR.deny('Không thể ứng tuyển task của chính mình', 'BUSINESS_RULE')
  }

  if (ctx.taskVisibility !== TaskVisibility.EXTERNAL && ctx.taskVisibility !== TaskVisibility.ALL) {
    return PR.deny('Task này không mở cho ứng tuyển bên ngoài', 'BUSINESS_RULE')
  }

  if (ctx.hasExistingApplication) {
    return PR.deny('Bạn đã ứng tuyển task này rồi', 'BUSINESS_RULE')
  }

  return PR.allow()
}

/**
 * Validate that a user can be assigned to a task.
 *
 * Rules:
 * - Must be an org member OR a freelancer (for external/all tasks)
 */
export function validateAssignee(ctx: {
  isOrgMember: boolean
  isFreelancer: boolean
  taskVisibility: string
}): PolicyResult {
  // Org members can always be assigned
  if (ctx.isOrgMember) return PR.allow()

  // Freelancers can be assigned to external/all tasks
  if (ctx.isFreelancer) {
    if (
      ctx.taskVisibility === TaskVisibility.EXTERNAL ||
      ctx.taskVisibility === TaskVisibility.ALL
    ) {
      return PR.allow()
    }
    return PR.deny(
      'Freelancer chỉ có thể được giao cho task có visibility external hoặc all',
      'BUSINESS_RULE'
    )
  }

  return PR.deny('Người được giao phải là thành viên tổ chức hoặc freelancer', 'BUSINESS_RULE')
}

/**
 * Check if an assignment can be revoked.
 *
 * Rules:
 * - Assignment must be ACTIVE
 * - Reason must be provided (non-empty)
 */
export function canRevokeAssignment(ctx: {
  assignmentStatus: string
  reason: string | null | undefined
}): PolicyResult {
  if (ctx.assignmentStatus !== AssignmentStatus.ACTIVE) {
    return PR.deny('Chỉ có thể revoke assignments đang active', 'BUSINESS_RULE')
  }

  if (!ctx.reason || ctx.reason.trim() === '') {
    return PR.deny('Phải cung cấp lý do khi revoke task access', 'BUSINESS_RULE')
  }

  return PR.allow()
}

/**
 * Validate a batch status update request.
 *
 * Rules:
 * - Must have at least 1 task
 * - Cannot exceed max batch size
 * - New status must be a valid TaskStatus
 */
export function validateBatchStatusUpdate(ctx: {
  taskCount: number
  newStatus: string
  maxBatchSize: number
}): PolicyResult {
  if (ctx.taskCount === 0) {
    return PR.deny('Phải chọn ít nhất 1 task để cập nhật', 'BUSINESS_RULE')
  }

  if (ctx.taskCount > ctx.maxBatchSize) {
    return PR.deny(
      `Không thể cập nhật quá ${ctx.maxBatchSize} tasks cùng lúc (đang chọn ${ctx.taskCount})`,
      'BUSINESS_RULE'
    )
  }

  const validStatuses = Object.values(TaskStatus) as string[]
  if (!validStatuses.includes(ctx.newStatus)) {
    return PR.deny(`Trạng thái không hợp lệ: ${ctx.newStatus}`, 'BUSINESS_RULE')
  }

  return PR.allow()
}

/**
 * Validate task creation fields (status, label, priority, due_date).
 *
 * Rules:
 * - Status (if provided) must be a valid TaskStatus
 * - Label (if provided) must be a valid TaskLabel
 * - Priority (if provided) must be a valid TaskPriority
 * - Due date (if provided) must not be in the past
 */
export function validateTaskCreationFields(ctx: {
  status: string | null
  label: string | null
  priority: string | null
  isDueDateInPast: boolean
}): PolicyResult {
  if (ctx.status) {
    const validStatuses = Object.values(TaskStatus) as string[]
    if (!validStatuses.includes(ctx.status)) {
      return PR.deny(`Trạng thái task không hợp lệ: ${ctx.status}`, 'BUSINESS_RULE')
    }
  }

  if (ctx.label) {
    const validLabels = Object.values(TaskLabel) as string[]
    if (!validLabels.includes(ctx.label)) {
      return PR.deny(`Nhãn task không hợp lệ: ${ctx.label}`, 'BUSINESS_RULE')
    }
  }

  if (ctx.priority) {
    const validPriorities = Object.values(TaskPriority) as string[]
    if (!validPriorities.includes(ctx.priority)) {
      return PR.deny(`Mức ưu tiên không hợp lệ: ${ctx.priority}`, 'BUSINESS_RULE')
    }
  }

  if (ctx.isDueDateInPast) {
    return PR.deny('Due date không thể là thời điểm trong quá khứ', 'BUSINESS_RULE')
  }

  return PR.allow()
}

/**
 * Check if a task application can be processed.
 *
 * Rules:
 * - Only task creator can process applications
 */
export function canProcessApplication(ctx: {
  actorId: DatabaseId
  taskCreatorId: DatabaseId
}): PolicyResult {
  if (!isSameId(ctx.actorId, ctx.taskCreatorId)) {
    return PR.deny('Bạn không có quyền xử lý đơn ứng tuyển cho task này')
  }

  return PR.allow()
}
