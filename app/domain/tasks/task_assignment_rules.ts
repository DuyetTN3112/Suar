/**
 * Task Assignment Rules — Pure business rules for task applications and assignments.
 *
 * All functions are synchronous, pure, and have 0 database dependencies.
 *
 * @module TaskAssignmentRules
 */

import { isSameId } from '#domain/identifiers/id_utils'
import type { PolicyResult } from '#domain/policies/policy_result'
import { PolicyResult as PR } from '#domain/policies/policy_result'
import type { DatabaseId } from '#types/database'

const PUBLIC_TASK_VISIBILITIES = new Set(['external', 'all'])
const VALID_TASK_STATUSES = ['todo', 'in_progress', 'done', 'cancelled', 'in_review'] as const
const VALID_TASK_LABELS = ['bug', 'feature', 'enhancement', 'documentation'] as const
const VALID_TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const

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
  isTaskAlreadyAssigned: boolean
  isApplicationDeadlinePassed: boolean
  hasExistingApplication: boolean
}): PolicyResult {
  if (isSameId(ctx.actorId, ctx.taskCreatorId)) {
    return PR.deny('Không thể ứng tuyển task của chính mình', 'BUSINESS_RULE')
  }

  if (!PUBLIC_TASK_VISIBILITIES.has(ctx.taskVisibility)) {
    return PR.deny('Task này không mở cho ứng tuyển bên ngoài', 'BUSINESS_RULE')
  }

  if (ctx.isTaskAlreadyAssigned) {
    return PR.deny('Task này đã được giao, không thể ứng tuyển thêm', 'BUSINESS_RULE')
  }

  if (ctx.isApplicationDeadlinePassed) {
    return PR.deny('Đã quá hạn nộp đơn ứng tuyển cho task này', 'BUSINESS_RULE')
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
    if (ctx.taskVisibility === 'external' || ctx.taskVisibility === 'all') {
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
  if (ctx.assignmentStatus !== 'active') {
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
 * - New status id must be provided
 */
export function validateBatchStatusUpdate(ctx: {
  taskCount: number
  newStatusId: string
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

  if (ctx.newStatusId.trim().length === 0) {
    return PR.deny('Task status id là bắt buộc', 'BUSINESS_RULE')
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
    if (!VALID_TASK_STATUSES.includes(ctx.status as (typeof VALID_TASK_STATUSES)[number])) {
      return PR.deny(`Trạng thái task không hợp lệ: ${ctx.status}`, 'BUSINESS_RULE')
    }
  }

  if (ctx.label) {
    if (!VALID_TASK_LABELS.includes(ctx.label as (typeof VALID_TASK_LABELS)[number])) {
      return PR.deny(`Nhãn task không hợp lệ: ${ctx.label}`, 'BUSINESS_RULE')
    }
  }

  if (ctx.priority) {
    if (!VALID_TASK_PRIORITIES.includes(ctx.priority as (typeof VALID_TASK_PRIORITIES)[number])) {
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
  action: 'approve' | 'reject'
  isTaskAlreadyAssigned: boolean
}): PolicyResult {
  if (!isSameId(ctx.actorId, ctx.taskCreatorId)) {
    return PR.deny('Bạn không có quyền xử lý đơn ứng tuyển cho task này')
  }

  if (ctx.action === 'approve' && ctx.isTaskAlreadyAssigned) {
    return PR.deny('Task này đã được giao, không thể duyệt thêm đơn ứng tuyển', 'BUSINESS_RULE')
  }

  return PR.allow()
}
