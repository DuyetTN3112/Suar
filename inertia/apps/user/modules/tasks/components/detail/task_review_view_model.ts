import { getTaskVisibilityLabel } from '@/apps/user/modules/tasks/lib/rules/task_visibility'

import {
  buildReviewMetadata,
  buildReviewTaskDetail,
  formatDate as formatWithDateTime,
  formatHours,
  getDeliveryTiming,
  toDisplayLines,
} from './task_review_helpers.js'
import type { Reviewer, TaskReviewDetailPayload } from './task_review_types.js'

export interface TaskDisplayPropsInput {
  sourceTask: Record<string, unknown>
  detail: TaskReviewDetailPayload
  taskId: string
  projectId?: string | null
  revieweeId: string
  taskCreatorId: string
  dateTimeFormatter: Intl.DateTimeFormat
  t: (key: string, params?: Record<string, unknown>, fallback?: string) => string
}

export function resolveTaskDisplayProperties(input: TaskDisplayPropsInput) {
  const { sourceTask, detail, taskId, projectId, revieweeId, taskCreatorId, dateTimeFormatter, t } = input

  function formatDate(value: unknown): string {
    return formatWithDateTime(value, dateTimeFormatter)
  }

  function toSafeString(val: unknown, fallback: string = ''): string {
    if (typeof val === 'string' && val.length > 0) return val
    if (typeof val === 'number' || typeof val === 'boolean') return String(val)
    return fallback
  }

  const taskTitle = toSafeString(sourceTask.title, t('task.review_workflow.untitled_task', {}, 'Untitled task'))
  const taskDescription = toSafeString(sourceTask.description, '')
  const taskStatus = toSafeString(sourceTask.status, '—')
  const taskStatusId = toSafeString(sourceTask.task_status_id, taskStatus)
  const taskPriority = toSafeString(sourceTask.priority, '—')
  const taskDifficulty = toSafeString(sourceTask.difficulty, '—')
  const taskAssignee = toSafeString(sourceTask.assignee_name, toSafeString(sourceTask.assigned_to, '—'))
  const taskCreator = toSafeString(sourceTask.creator_name, toSafeString(sourceTask.creator_id, '—'))
  const taskDueDate = formatDate(sourceTask.due_date)
  const taskLabel = toSafeString(sourceTask.label, '—')
  const taskEstimatedTime = formatHours(detail.assignment?.estimated_hours ?? sourceTask.estimated_time)
  const taskActualTime = formatHours(detail.assignment?.actual_hours ?? sourceTask.actual_time)
  const taskVisibility = getTaskVisibilityLabel(
    toSafeString(sourceTask.task_visibility, toSafeString(sourceTask.visibility, '')),
    t
  )
  const taskCreatedAt = formatDate(sourceTask.created_at)
  const taskUpdatedAt = formatDate(sourceTask.updated_at)
  const assignmentCompletedAt = formatDate(detail.assignment?.completed_at)
  const organizationName = toSafeString(sourceTask.organization_name, '')
  const projectName = toSafeString(sourceTask.project_name, '')
  const taskExpectedDeliverables = toDisplayLines(sourceTask.expected_deliverables)
  const deliveryTiming = getDeliveryTiming(sourceTask.due_date, detail.assignment?.completed_at, t)

  const reviewTask = buildReviewTaskDetail({
    sourceTask,
    taskId,
    taskTitle,
    taskDescription,
    taskStatus,
    taskStatusId,
    taskLabel,
    taskPriority,
    revieweeId,
    taskCreatorId,
    projectId: projectId ?? null,
    taskAssignee,
    taskCreator,
    organizationName,
    projectName,
    estimatedHours: detail.assignment?.estimated_hours ?? sourceTask.estimated_time,
    actualHours: detail.assignment?.actual_hours ?? sourceTask.actual_time,
    taskExpectedDeliverables,
  })

  const reviewMetadata = buildReviewMetadata({
    taskStatusId,
    taskStatus,
    taskLabel,
    taskPriority,
    revieweeId,
    taskAssignee,
    taskCreatorId,
    taskCreator,
    reviewers: detail.reviewers,
  })

  return {
    taskTitle,
    taskDescription,
    taskStatus,
    taskPriority,
    taskDifficulty,
    taskAssignee,
    taskDueDate,
    taskLabel,
    taskEstimatedTime,
    taskActualTime,
    taskVisibility,
    taskCreatedAt,
    taskUpdatedAt,
    assignmentCompletedAt,
    deliveryTiming,
    taskCreator,
    reviewTask,
    reviewMetadata,
    formatDate,
  }
}

export function resolveReviewPermissions(params: {
  currentUserId?: string | null
  revieweeId: string
  taskCreatorId: string
  workflow: unknown
  workflowStatus: string
  taskId: string
  reviewers: Reviewer[]
  hasSubmittedReview: boolean
}) {
  const isReviewee = Boolean(params.currentUserId && params.revieweeId === params.currentUserId)
  const isReviewer = Boolean(
    params.reviewers.some((reviewer) => reviewer.reviewer_id === params.currentUserId)
  )
  const canStartWorkflow = Boolean(
    !params.workflow &&
      params.currentUserId &&
      params.currentUserId === params.taskCreatorId &&
      !isReviewee
  )
  const canSubmitReview = Boolean(
    canStartWorkflow ||
      (params.currentUserId &&
        params.taskId &&
        !isReviewee &&
        params.workflow &&
        ['awaiting_review', 'in_review', 'awaiting_response'].includes(params.workflowStatus))
  )
  const canCreateReview = Boolean(canSubmitReview && !params.hasSubmittedReview)
  const canEditSubmittedReview = Boolean(
    params.hasSubmittedReview &&
      isReviewer &&
      ['in_review', 'awaiting_response', 'disputed'].includes(params.workflowStatus)
  )

  return {
    isReviewee,
    isReviewer,
    canStartWorkflow,
    canSubmitReview,
    canCreateReview,
    canEditSubmittedReview,
  }
}
