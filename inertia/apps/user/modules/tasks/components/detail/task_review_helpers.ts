import axios from 'axios'

import type { TaskDetail, TaskLabel, TaskMetadata, TaskPriority } from '@/apps/user/modules/tasks/types/index.svelte'

import type { DetailUserMessage, Reviewer } from './task_review_types.js'

export async function loadCanonicalTaskDetail(taskId: string): Promise<Record<string, unknown> | null> {
  const response = await axios.get<Record<string, unknown>>(`/api/v1/tasks/${encodeURIComponent(taskId)}`)
  const responseData: Record<string, unknown> = response.data
  const rawPayload: unknown = 'data' in responseData && responseData['data'] ? responseData['data'] : responseData
  if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
    return null
  }
  return rawPayload as Record<string, unknown>
}

type TranslationFunction = (key: string, params?: Record<string, unknown>, fallback?: string) => string
export type ReviewActionErrors = Record<string, string | string[] | undefined>

export function reviewWorkflowStatusLabel(status: string, t: TranslationFunction): string {
  const labels: Record<string, [string, string]> = {
    awaiting_review: ['task.review_workflow.status.awaiting_review', 'Waiting for review'],
    in_review: ['task.review_workflow.status.in_review', 'In review'],
    awaiting_response: ['task.review_workflow.status.awaiting_response', 'Waiting for response'],
    disputed: ['task.review_workflow.status.disputed', 'Disputed'],
    reported: ['task.review_workflow.status.reported', 'Dispute reported'],
    ai_reviewing: ['task.review_workflow.status.ai_reviewing', 'AI reviewing'],
    admin_reviewing: ['task.review_workflow.status.admin_reviewing', 'Waiting for admin decision'],
    resolved: ['task.review_workflow.status.resolved', 'Resolved'],
    done: ['task.review_workflow.status.done', 'Done'],
  }
  const [key, fallback] = labels[status] ?? ['task.review_workflow.status.unknown', 'Unknown status']
  return t(key, {}, fallback)
}

export function reviewMessageTypeLabel(type: string | undefined, t: TranslationFunction): string {
  const labels: Record<string, [string, string]> = {
    review: ['task.review_workflow.message_type.review', 'Review'],
    reviewee_response: ['task.review_workflow.message_type.reviewee_response', 'Reviewee response'],
    dispute_reply: ['task.review_workflow.message_type.dispute_reply', 'Dispute discussion'],
    system: ['task.review_workflow.message_type.system', 'System'],
  }
  const [key, fallback] = labels[type ?? 'system'] ?? ['task.review_workflow.message_type.system', 'System']
  return t(key, {}, fallback)
}

export function reviewerStatusLabel(status: Reviewer['status'], t: TranslationFunction): string {
  const labels: Record<Reviewer['status'], [string, string]> = {
    pending: ['task.review_workflow.reviewer_status.pending', 'Pending'],
    submitted: ['task.review_workflow.reviewer_status.submitted', 'Submitted'],
    waived: ['task.review_workflow.reviewer_status.waived', 'Waived'],
  }
  const [key, fallback] = labels[status]
  return t(key, {}, fallback)
}

export function reviewerRoleLabel(role: string, t: TranslationFunction): string {
  const labels: Record<string, [string, string]> = {
    task_giver_required: ['task.review_workflow.reviewer_role.task_giver_required', 'Task giver'],
    project_member_reviewer: ['task.review_workflow.reviewer_role.project_member_reviewer', 'Project reviewer'],
  }
  const [key, fallback]: [string, string] = labels[role] ?? [
    'task.review_workflow.reviewer_role.project_member_reviewer',
    'Project reviewer',
  ]
  return t(key, {}, fallback)
}

export function reviewMessageAuthorLabel(message: DetailUserMessage, t: TranslationFunction): string {
  return message.message_type === 'system'
    ? t('task.review_workflow.message_type.system', {}, 'System')
    : (message.author_name ?? message.author_id)
}

export function reviewMessageBodyLabel(message: DetailUserMessage, t: TranslationFunction): string {
  if (message.message_type !== 'system') return message.body

  const normalizedBody = message.body.toLowerCase()
  if (normalizedBody.includes('dispute reported') || normalizedBody.includes('đã báo cáo tranh chấp')) {
    return t('task.review_workflow.system_event.dispute_reported', {}, 'A dispute report was sent.')
  }

  return message.body
}

export function formatDate(value: unknown, dateTimeFormatter: Intl.DateTimeFormat): string {
  if (typeof value !== 'string' && !(value instanceof Date)) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return dateTimeFormatter.format(parsed)
}

export function formatHours(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  const hours = Number(value)
  return Number.isFinite(hours) ? `${hours}h` : '—'
}

export function parseListValue(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) return value
  try {
    return JSON.parse(trimmed)
  } catch {
    return value
  }
}

export function toDisplayLines(value: unknown): string[] {
  const parsed = parseListValue(value)
  const items = Array.isArray(parsed) ? parsed : parsed ? [parsed] : []

  return items
    .map((item) => {
      if (typeof item === 'string' || typeof item === 'number') return String(item).trim()
      if (!item || typeof item !== 'object') return ''
      const record = item as Record<string, unknown>
      const candidate =
        record['title'] ??
        record['name'] ??
        record['description'] ??
        record['deliverable'] ??
        record['text'] ??
        record['value']
      if (typeof candidate === 'string' || typeof candidate === 'number') {
        return String(candidate).trim()
      }
      return ''
    })
    .filter(Boolean)
}

export function getDeliveryTiming(
  dueValue: unknown,
  completedValue: unknown,
  t: TranslationFunction
): {
  label: string
  isLate: boolean
} {
  const dueAt = typeof dueValue === 'string' || dueValue instanceof Date ? new Date(dueValue) : null
  if (!dueAt || Number.isNaN(dueAt.getTime())) return { label: '', isLate: false }

  const completedAt =
    typeof completedValue === 'string' || completedValue instanceof Date
      ? new Date(completedValue)
      : null
  const hasCompletion = Boolean(completedAt && !Number.isNaN(completedAt.getTime()))
  const comparisonAt = completedAt ? completedAt.getTime() : Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  const dayDifference = Math.ceil((comparisonAt - dueAt.getTime()) / dayMs)

  if (hasCompletion) {
    if (dayDifference > 0) {
      return {
        label: t(
          'task.review_workflow.completed_late_days',
          { count: dayDifference },
          `Completed ${dayDifference} days late`
        ),
        isLate: true,
      }
    }
    if (dayDifference < 0) {
      const count = Math.abs(dayDifference)
      return {
        label: t(
          'task.review_workflow.completed_early_days',
          { count },
          `Completed ${count} days early`
        ),
        isLate: false,
      }
    }
    return {
      label: t('task.review_workflow.completed_on_time', {}, 'Completed on time'),
      isLate: false,
    }
  }

  if (dayDifference > 0) {
    return {
      label: t(
        'task.review_workflow.overdue_days',
        { count: dayDifference },
        `${dayDifference} days overdue`
      ),
      isLate: true,
    }
  }

  return { label: '', isLate: false }
}

export function extractActionError(errors: ReviewActionErrors, t: TranslationFunction): string {
  const message = errors.body ?? errors.reason ?? errors.message ?? Object.values(errors)[0]
  if (Array.isArray(message)) return message[0] ?? t('task.review_workflow.action_failed', {}, 'Review action failed. Please try again.')
  return message ?? t('task.review_workflow.action_failed', {}, 'Review action failed. Please try again.')
}

export function buildReviewTaskDetail(input: {
  sourceTask: Record<string, unknown>
  taskId: string
  taskTitle: string
  taskDescription: string
  taskStatus: string
  taskStatusId: string
  taskLabel: string
  taskPriority: string
  revieweeId: string
  taskCreatorId: string
  projectId: string | null
  taskAssignee: string
  taskCreator: string
  organizationName: string
  projectName: string
  estimatedHours: unknown
  actualHours: unknown
  taskExpectedDeliverables: string[]
}): TaskDetail {
  const orgId = typeof input.sourceTask.organization_id === 'string' || typeof input.sourceTask.organization_id === 'number'
    ? String(input.sourceTask.organization_id)
    : ''
  const projId = typeof input.sourceTask.project_id === 'string' || typeof input.sourceTask.project_id === 'number'
    ? String(input.sourceTask.project_id)
    : ''

  const toLabel = (val: string): TaskLabel => (val === 'bug' || val === 'enhancement' || val === 'documentation' ? val : 'feature')
  const toPriority = (val: string): TaskPriority => (val === 'low' || val === 'high' || val === 'urgent' ? val : 'medium')

  const detail: TaskDetail = {
    ...input.sourceTask,
    id: input.taskId,
    title: input.taskTitle,
    description: input.taskDescription,
    status: input.taskStatus,
    task_status_id: input.taskStatusId,
    label: toLabel(input.taskLabel),
    priority: toPriority(input.taskPriority),
    assigned_to: input.revieweeId || null,
    creator_id: input.taskCreatorId,
    due_date: typeof input.sourceTask.due_date === 'string' ? input.sourceTask.due_date : null,
    created_at: typeof input.sourceTask.created_at === 'string' ? input.sourceTask.created_at : '',
    updated_at: typeof input.sourceTask.updated_at === 'string' ? input.sourceTask.updated_at : '',
    organization_id: orgId,
    project_id: input.projectId ?? projId,
    assignee: input.revieweeId ? { id: input.revieweeId, username: input.taskAssignee, email: '' } : undefined,
    creator: input.taskCreatorId ? { id: input.taskCreatorId, username: input.taskCreator, email: '' } : undefined,
    organization: input.organizationName ? { id: orgId, name: input.organizationName } : undefined,
    project: input.projectName ? { id: input.projectId ?? projId, name: input.projectName } : undefined,
    estimated_time: Number(input.estimatedHours) || undefined,
    actual_time: Number(input.actualHours) || undefined,
    expected_deliverables: input.taskExpectedDeliverables,
    tech_stack: toDisplayLines(input.sourceTask.tech_stack),
    domain_tags: toDisplayLines(input.sourceTask.domain_tags),
  }
  return detail
}

export function buildReviewMetadata(input: {
  taskStatusId: string
  taskStatus: string
  taskLabel: string
  taskPriority: string
  revieweeId: string
  taskAssignee: string
  taskCreatorId: string
  taskCreator: string
  reviewers: Reviewer[]
}): Pick<TaskMetadata, 'statuses' | 'labels' | 'priorities' | 'users'> {
  return {
    statuses: [{ value: input.taskStatusId, label: input.taskStatus }],
    labels: [{ value: input.taskLabel, label: input.taskLabel }],
    priorities: [{ value: input.taskPriority, label: input.taskPriority }],
    users: [
      ...(input.revieweeId ? [{ id: input.revieweeId, username: input.taskAssignee, email: '' }] : []),
      ...(input.taskCreatorId && input.taskCreatorId !== input.revieweeId
        ? [{ id: input.taskCreatorId, username: input.taskCreator, email: '' }]
        : []),
      ...input.reviewers
        .filter((reviewer) => reviewer.reviewer_id !== input.revieweeId && reviewer.reviewer_id !== input.taskCreatorId)
        .map((reviewer) => ({ id: reviewer.reviewer_id, username: reviewer.reviewer_name ?? reviewer.reviewer_id, email: '' })),
    ],
  }
}

export function mergeCanonicalTask(
  detailTask: Record<string, unknown>,
  canonicalTask: Record<string, unknown> | null
): Record<string, unknown> {
  const merged = { ...detailTask, ...(canonicalTask ?? {}) }
  const reviewBrief = detailTask.resolved_brief
  const canonicalBrief = canonicalTask?.resolved_brief
  const canonicalHasContract =
    canonicalBrief &&
    typeof canonicalBrief === 'object' &&
    'resolvedContract' in canonicalBrief &&
    Boolean((canonicalBrief as { resolvedContract?: unknown }).resolvedContract)

  if (reviewBrief && !canonicalHasContract) {
    merged.resolved_brief = reviewBrief
  }
  if (
    detailTask.required_skills_rel &&
    (!canonicalTask?.required_skills_rel ||
      (canonicalTask.required_skills_rel as unknown[]).length === 0)
  ) {
    merged.required_skills_rel = detailTask.required_skills_rel
  }
  return merged
}
