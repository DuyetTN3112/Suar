import type { PolicyResult } from '#modules/authorization/public_contracts/policy_result'
import { PolicyResult as PR } from '#modules/authorization/public_contracts/policy_result'

const FINAL_SUBMISSION_STATUSES = new Set(['submitted', 'accepted_for_review', 'locked'])
const EVIDENCE_REQUIRED_VERIFICATION_METHODS = new Set([
  'automated_test',
  'demo_presentation',
  'manual_qa',
  'user_acceptance_test',
  'load_test',
  'security_audit',
  'multi_step',
])

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

  if (
    EVIDENCE_REQUIRED_VERIFICATION_METHODS.has(ctx.verificationMethod) &&
    ctx.evidenceCount === 0
  ) {
    return PR.deny('Task submission evidence is required for this verification method', 'BUSINESS_RULE')
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
