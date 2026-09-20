import type { DetailUserMessage, Reviewer } from './task_review_types.js'

export type TranslateFn = (key: string, params?: Record<string, unknown>, fallback?: string) => string
export type ReviewActionErrors = Record<string, string | string[] | undefined>

export function reviewWorkflowStatusLabel(status: string, t: TranslateFn): string {
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

export function reviewMessageTypeLabel(type: string | undefined, t: TranslateFn): string {
  const labels: Record<string, [string, string]> = {
    review: ['task.review_workflow.message_type.review', 'Review'],
    reviewee_response: ['task.review_workflow.message_type.reviewee_response', 'Reviewee response'],
    dispute_reply: ['task.review_workflow.message_type.dispute_reply', 'Dispute discussion'],
    system: ['task.review_workflow.message_type.system', 'System'],
  }
  const [key, fallback] = labels[type ?? 'system'] ?? ['task.review_workflow.message_type.system', 'System']
  return t(key, {}, fallback)
}

export function reviewerStatusLabel(status: Reviewer['status'], t: TranslateFn): string {
  const labels: Record<Reviewer['status'], [string, string]> = {
    pending: ['task.review_workflow.reviewer_status.pending', 'Pending'],
    submitted: ['task.review_workflow.reviewer_status.submitted', 'Submitted'],
    waived: ['task.review_workflow.reviewer_status.waived', 'Waived'],
  }
  const [key, fallback] = labels[status]
  return t(key, {}, fallback)
}

export function reviewerRoleLabel(role: string, t: TranslateFn): string {
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

export function reviewMessageAuthorLabel(message: DetailUserMessage, t: TranslateFn): string {
  return message.message_type === 'system'
    ? t('task.review_workflow.message_type.system', {}, 'System')
    : (message.author_name ?? message.author_id)
}

export function reviewMessageBodyLabel(message: DetailUserMessage, t: TranslateFn): string {
  if (message.message_type !== 'system') return message.body

  const normalizedBody = message.body.toLowerCase()
  if (normalizedBody.includes('dispute reported') || normalizedBody.includes('đã báo cáo tranh chấp')) {
    return t('task.review_workflow.system_event.dispute_reported', {}, 'A dispute report was sent.')
  }

  return message.body
}

export function extractActionError(errors: ReviewActionErrors, t: TranslateFn): string {
  const message = errors.body ?? errors.reason ?? errors.message ?? Object.values(errors)[0]
  if (Array.isArray(message)) {
    return message[0] ?? t('task.review_workflow.action_failed', {}, 'Review action failed. Please try again.')
  }
  return message ?? t('task.review_workflow.action_failed', {}, 'Review action failed. Please try again.')
}
