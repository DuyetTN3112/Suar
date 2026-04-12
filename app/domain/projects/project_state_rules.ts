/**
 * Project State Rules — Pure business rules for project state validation.
 *
 * All functions are synchronous, pure, and have 0 database dependencies.
 *
 * @module ProjectStateRules
 */

import { ProjectStatus } from '#constants/project_constants'
import type { PolicyResult } from '#domain/shared/policy_result'
import { PolicyResult as PR } from '#domain/shared/policy_result'

/**
 * Validate project date constraints.
 *
 * Rules:
 * - If both start_date and end_date are provided, start_date must not be after end_date
 */
export function validateProjectDates(ctx: {
  startDate: Date | string | null
  endDate: Date | string | null
}): PolicyResult {
  if (ctx.startDate === null || ctx.endDate === null) {
    return PR.allow()
  }

  const start = new Date(ctx.startDate)
  const end = new Date(ctx.endDate)

  if (start > end) {
    return PR.deny('Start date không được lớn hơn end date', 'BUSINESS_RULE')
  }

  return PR.allow()
}

/**
 * Validate project status is a valid ProjectStatus enum value.
 */
export function validateProjectStatus(status: string): PolicyResult {
  const validStatuses = Object.values(ProjectStatus) as string[]
  if (!validStatuses.includes(status)) {
    return PR.deny(`Trạng thái dự án không hợp lệ: ${status}`, 'BUSINESS_RULE')
  }
  return PR.allow()
}

/**
 * Check if a project can be deleted given its incomplete task count.
 *
 * Rules:
 * - Cannot delete if there are incomplete tasks (not done, not cancelled)
 */
export function canDeleteProjectWithTasks(ctx: { incompleteTaskCount: number }): PolicyResult {
  if (ctx.incompleteTaskCount > 0) {
    return PR.deny(
      `Dự án có ${ctx.incompleteTaskCount} công việc chưa hoàn thành. Vui lòng hoàn thành hoặc hủy các công việc trước khi xóa dự án.`,
      'BUSINESS_RULE'
    )
  }
  return PR.allow()
}

/**
 * Check if a member can be removed from the project.
 *
 * Rules:
 * - Cannot remove the owner
 * - Cannot remove the creator
 */
export function canRemoveMemberFromProject(ctx: {
  targetUserId: string
  projectOwnerId: string
  projectCreatorId: string
}): PolicyResult {
  if (ctx.targetUserId === ctx.projectOwnerId) {
    return PR.deny('Không thể xóa owner khỏi dự án', 'BUSINESS_RULE')
  }

  if (ctx.targetUserId === ctx.projectCreatorId) {
    return PR.deny('Không thể xóa người tạo dự án', 'BUSINESS_RULE')
  }

  return PR.allow()
}
