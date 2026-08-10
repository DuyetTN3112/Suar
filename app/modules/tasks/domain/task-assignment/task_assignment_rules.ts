/**
 * Task Assignment Rules — Pure business rules for task applications and assignments.
 *
 * All functions are synchronous, pure, and have 0 database dependencies.
 *
 * @module TaskAssignmentRules
 */

import type { PolicyResult } from '#modules/authorization/public_contracts/policy_result'
import { PolicyResult as PR } from '#modules/authorization/public_contracts/policy_result'

const isSameId = (a: string, b: string): boolean => a === b

const PUBLIC_TASK_VISIBILITIES = new Set(['external', 'all'])
const VALID_TASK_STATUSES = ['todo', 'in_progress', 'done', 'cancelled', 'in_review'] as const
const VALID_TASK_LABELS = ['bug', 'feature', 'enhancement', 'documentation'] as const
const VALID_TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const

/**
 * Check if a user can request to join a marketplace task.
 *
 * Rules:
 * - Cannot request to join your own task
 * - Task must have external or all visibility
 * - Cannot request to join if an application already exists (duplicate check)
 */
export function canApplyForTask(ctx: {
  actorId: string
  taskCreatorId: string
  taskVisibility: string
  isOrganizationMember?: boolean
  isPublicProject?: boolean
  allowsExternalContributors?: boolean
  isTaskAlreadyAssigned: boolean
  isApplicationDeadlinePassed: boolean
  hasExistingApplication: boolean
}): PolicyResult {
  if (isSameId(ctx.actorId, ctx.taskCreatorId)) {
    return PR.deny('Không thể gửi đề xuất tham gia task của chính mình', 'BUSINESS_RULE')
  }

  if (ctx.taskVisibility === 'internal' && ctx.isOrganizationMember === true) {
    // Organization-wide tasks may receive applications from members through the
    // organization's internal opportunity flow.
  } else if (
    PUBLIC_TASK_VISIBILITIES.has(ctx.taskVisibility) &&
    ctx.isPublicProject === true &&
    ctx.allowsExternalContributors === true
  ) {
    // Public applications require both task-level exposure and a project that
    // explicitly participates in the public marketplace.
  } else {
    return PR.deny('Task này không mở cho đề xuất tham gia bên ngoài', 'BUSINESS_RULE')
  }

  if (ctx.isTaskAlreadyAssigned) {
    return PR.deny('Task này đã được giao, không thể nhận thêm đề xuất tham gia', 'BUSINESS_RULE')
  }

  if (ctx.isApplicationDeadlinePassed) {
    return PR.deny('Đã quá hạn nộp đề xuất tham gia cho task này', 'BUSINESS_RULE')
  }

  if (ctx.hasExistingApplication) {
    return PR.deny('Bạn đã gửi đề xuất tham gia task này rồi', 'BUSINESS_RULE')
  }

  return PR.allow()
}

/**
 * Validate that a user can be assigned to a task.
 *
 * Rules:
 * - Must be an org member OR an external contributor (for external/all tasks)
 */
export function validateAssignee(ctx: {
  isOrgMember: boolean
  isExternalContributor: boolean
  isProjectMember?: boolean
  taskVisibility: string
}): PolicyResult {
  if (ctx.taskVisibility === 'project' && !ctx.isProjectMember) {
    return PR.deny('Task chỉ có thể giao cho thành viên của project', 'BUSINESS_RULE')
  }

  // Org members can always be assigned
  if (ctx.isOrgMember) return PR.allow()

  if (ctx.isExternalContributor) {
    if (ctx.taskVisibility === 'external' || ctx.taskVisibility === 'all') {
      return PR.allow()
    }
    return PR.deny(
      'Contributor bên ngoài chỉ có thể được giao cho task có visibility external hoặc all',
      'BUSINESS_RULE'
    )
  }

  return PR.deny('Người được giao phải là thành viên tổ chức hoặc contributor bên ngoài', 'BUSINESS_RULE')
}

/**
 * Validate a direct assignment from the project task board.
 *
 * A task is only a direct hand-off when the creator, worker and (when chosen)
 * reviewer all belong to the project. Organization-wide and marketplace
 * tasks are opportunities and must be applied for instead.
 */
export function validateDirectTaskAssignee(ctx: {
  taskVisibility: string
  isActorProjectMember: boolean
  isAssigneeProjectMember: boolean
  isReviewerProjectMember?: boolean
}): PolicyResult {
  if (ctx.taskVisibility !== 'project') {
    return PR.deny(
      'Task ngoài project không thể giao trực tiếp; hãy mở luồng ứng tuyển',
      'BUSINESS_RULE'
    )
  }

  if (!ctx.isActorProjectMember) {
    return PR.deny('Chỉ thành viên project mới có thể giao task trực tiếp', 'BUSINESS_RULE')
  }

  if (!ctx.isAssigneeProjectMember) {
    return PR.deny('Người thực hiện phải là thành viên của project để giao trực tiếp', 'BUSINESS_RULE')
  }

  if (ctx.isReviewerProjectMember === false) {
    return PR.deny('Người nghiệm thu ngoài project sẽ đi theo luồng ứng tuyển', 'BUSINESS_RULE')
  }

  return PR.allow()
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
 * - Task creator can process applications
 * - Project owner/manager can process applications
 * - Organization owner/admin can process applications for tasks in their organization
 */
export function canProcessApplication(ctx: {
  actorId: string
  taskCreatorId: string
  action: 'approve' | 'reject'
  isTaskAlreadyAssigned: boolean
  isProjectOwnerOrManager?: boolean
  isOrganizationOwnerOrAdmin?: boolean
}): PolicyResult {
  const isCreator = isSameId(ctx.actorId, ctx.taskCreatorId)
  const isManager = ctx.isProjectOwnerOrManager === true
  const isOrgLeader = ctx.isOrganizationOwnerOrAdmin === true

  if (!isCreator && !isManager && !isOrgLeader) {
    return PR.deny('Bạn không có quyền xử lý đề xuất tham gia cho task này')
  }

  if (ctx.action === 'approve' && ctx.isTaskAlreadyAssigned) {
    return PR.deny('Task này đã được giao, không thể duyệt thêm đề xuất tham gia', 'BUSINESS_RULE')
  }

  return PR.allow()
}
