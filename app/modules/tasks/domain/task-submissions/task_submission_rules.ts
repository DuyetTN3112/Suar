import type { PolicyResult } from '#modules/authorization/public_contracts/policy_result'
import { PolicyResult as PR } from '#modules/authorization/public_contracts/policy_result'
import { taskVerificationMethodRequiresEvidence } from '#modules/tasks/domain/task-authoring/task_verification_methods'

const FINAL_SUBMISSION_STATUSES = new Set(['submitted', 'accepted_for_review', 'locked'])
const REVIEWABLE_SUBMISSION_STATUSES = new Set(['submitted', 'accepted_for_review'])

export const TASK_SUBMISSION_EVIDENCE_TYPES = [
  'pull_request',
  'commit_link',
  'demo_recording',
  'test_report',
  'document_link',
  'screenshot',
  'metrics_screenshot',
  'deployment_link',
  'other',
] as const

export type TaskSubmissionEvidenceType = (typeof TASK_SUBMISSION_EVIDENCE_TYPES)[number]

const TASK_SUBMISSION_EVIDENCE_TYPE_SET = new Set<string>(TASK_SUBMISSION_EVIDENCE_TYPES)

export function isTaskSubmissionEvidenceType(value: unknown): value is TaskSubmissionEvidenceType {
  return typeof value === 'string' && TASK_SUBMISSION_EVIDENCE_TYPE_SET.has(value)
}

export function canEditTaskSubmission(ctx: {
  actorId: string
  assigneeId: string
  assignmentStatus: string
  submissionStatus: string | null
}): PolicyResult {
  if (ctx.actorId !== ctx.assigneeId) {
    return PR.deny('Only the active assignee can edit task submission', 'FORBIDDEN')
  }

  if (ctx.assignmentStatus !== 'active') {
    return PR.deny('Task submission requires an active assignment', 'BUSINESS_RULE')
  }

  if (ctx.submissionStatus === 'locked') {
    return PR.deny('Task submission is locked and cannot be edited', 'BUSINESS_RULE')
  }

  return PR.allow()
}

export function canSaveTaskSubmissionDraft(ctx: {
  actorId: string
  assigneeId: string
  assignmentStatus: string
  submissionStatus: string | null
}): PolicyResult {
  const editResult = canEditTaskSubmission(ctx)
  if (!editResult.allowed) return editResult

  if (ctx.submissionStatus !== null && FINAL_SUBMISSION_STATUSES.has(ctx.submissionStatus)) {
    return PR.deny('Submitted task submission cannot be changed back to draft', 'BUSINESS_RULE')
  }

  return PR.allow()
}

export function canLockTaskSubmission(submissionStatus: string): PolicyResult {
  if (submissionStatus === 'locked') {
    return PR.deny('Task submission is already locked', 'BUSINESS_RULE')
  }

  if (!REVIEWABLE_SUBMISSION_STATUSES.has(submissionStatus)) {
    return PR.deny(
      'Task submission must be submitted for review before it can be locked',
      'BUSINESS_RULE'
    )
  }

  return PR.allow()
}

export function canMutateTaskSubmissionEvidence(submissionStatus: string): PolicyResult {
  if (submissionStatus === 'locked') {
    return PR.deny('Task submission is locked', 'BUSINESS_RULE')
  }

  if (FINAL_SUBMISSION_STATUSES.has(submissionStatus)) {
    return PR.deny('Task submission evidence cannot be changed after submission', 'BUSINESS_RULE')
  }

  return PR.allow()
}

export function canSubmitTaskSubmission(ctx: {
  actorId: string
  assigneeId: string
  assignmentStatus: string
  taskStatus: string
  submissionStatus: string | null
}): PolicyResult {
  const editResult = canEditTaskSubmission(ctx)
  if (!editResult.allowed) return editResult

  if (ctx.taskStatus === 'cancelled') {
    return PR.deny('cancelled tasks cannot be submitted', 'BUSINESS_RULE')
  }

  if (ctx.taskStatus === 'done') {
    return PR.deny('Completed tasks cannot be submitted again', 'BUSINESS_RULE')
  }

  if (ctx.submissionStatus !== null && FINAL_SUBMISSION_STATUSES.has(ctx.submissionStatus)) {
    return PR.deny('Task submission is already submitted', 'BUSINESS_RULE')
  }

  return PR.allow()
}

export function validateTaskSubmissionPayload(ctx: {
  summary: string | null | undefined
  verificationMethod: string
  evidenceCount: number
  evidenceUrls?: string[]
}): PolicyResult {
  if (!ctx.summary || ctx.summary.trim().length === 0) {
    return PR.deny('Task submission summary is required', 'BUSINESS_RULE')
  }

  if (taskVerificationMethodRequiresEvidence(ctx.verificationMethod) && ctx.evidenceCount === 0) {
    return PR.deny(
      'Task submission evidence is required for this verification method',
      'BUSINESS_RULE'
    )
  }

  for (const url of ctx.evidenceUrls ?? []) {
    try {
      const parsed = new URL(url)
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return PR.deny('Task submission evidence URL must be HTTP or HTTPS', 'BUSINESS_RULE')
      }
    } catch {
      return PR.deny('Task submission evidence URL is invalid', 'BUSINESS_RULE')
    }
  }

  return PR.allow()
}
