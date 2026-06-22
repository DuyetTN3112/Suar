import type { PolicyResult } from '#modules/authorization/public_contracts/policy_result'
import { PolicyResult as PR } from '#modules/authorization/public_contracts/policy_result'

const ACTIVE_DISPUTE_STATUSES = new Set([
  'pending',
  'collecting_evidence',
  'admin_reviewing',
  'ai_reviewing',
])

const FINAL_DECISIONS = new Set([
  'uphold_review',
  'adjust_score',
  'request_re_review',
  'dismiss_dispute',
  'partially_accept',
])

const ADMIN_ROLES = new Set(['superadmin', 'system_admin'])

export function isActiveReviewDisputeStatus(status: string): boolean {
  return ACTIVE_DISPUTE_STATUSES.has(status)
}

export function canOpenReviewDispute(ctx: {
  actorId: string
  revieweeId: string
  reviewSessionStatus: string
  hasActiveDispute: boolean
  disputeReason: string | null | undefined
  daysSinceCompleted: number | null
}): PolicyResult {
  if (ctx.actorId !== ctx.revieweeId) {
    return PR.deny('Only the reviewee can open a review dispute', 'FORBIDDEN')
  }

  if (ctx.reviewSessionStatus !== 'completed') {
    return PR.deny('Only completed review sessions can be disputed', 'BUSINESS_RULE')
  }

  if (!ctx.disputeReason || ctx.disputeReason.trim().length === 0) {
    return PR.deny('Review dispute reason is required', 'BUSINESS_RULE')
  }

  if (ctx.hasActiveDispute) {
    return PR.deny('Review session already has an active dispute', 'BUSINESS_RULE')
  }

  if (ctx.daysSinceCompleted !== null && ctx.daysSinceCompleted > 14) {
    return PR.deny('Review dispute window has expired (14 days)', 'BUSINESS_RULE')
  }

  return PR.allow()
}

export function canResolveReviewDispute(ctx: {
  actorSystemRole: string
  disputeStatus: string
  finalDecision: string
  finalRationale: string | null | undefined
}): PolicyResult {
  if (!ADMIN_ROLES.has(ctx.actorSystemRole)) {
    return PR.deny('Only system admin can resolve review disputes', 'FORBIDDEN')
  }

  if (ctx.disputeStatus === 'resolved') {
    return PR.deny('Review dispute is already resolved', 'BUSINESS_RULE')
  }

  if (!isActiveReviewDisputeStatus(ctx.disputeStatus)) {
    return PR.deny('Review dispute is not active', 'BUSINESS_RULE')
  }

  if (!FINAL_DECISIONS.has(ctx.finalDecision)) {
    return PR.deny('Review dispute final decision is invalid', 'BUSINESS_RULE')
  }

  if (!ctx.finalRationale || ctx.finalRationale.trim().length === 0) {
    return PR.deny('Review dispute final rationale is required', 'BUSINESS_RULE')
  }

  return PR.allow()
}

export function canCommentOnReviewDispute(ctx: {
  disputeStatus: string
  body: string | null | undefined
  isParticipant: boolean
}): PolicyResult {
  if (!ctx.isParticipant) {
    return PR.deny('Only dispute participants can comment', 'FORBIDDEN')
  }

  if (!isActiveReviewDisputeStatus(ctx.disputeStatus)) {
    return PR.deny('Review dispute is not active', 'BUSINESS_RULE')
  }

  if (!ctx.body || ctx.body.trim().length === 0) {
    return PR.deny('Review dispute comment body is required', 'BUSINESS_RULE')
  }

  return PR.allow()
}

export function canRespondToReviewDispute(ctx: {
  disputeStatus: string
  body: string | null | undefined
  canRespond: boolean
}): PolicyResult {
  if (!ctx.canRespond) {
    return PR.deny('Only organization responder can respond to review dispute', 'FORBIDDEN')
  }

  if (!isActiveReviewDisputeStatus(ctx.disputeStatus)) {
    return PR.deny('Review dispute is not active', 'BUSINESS_RULE')
  }

  if (!ctx.body || ctx.body.trim().length === 0) {
    return PR.deny('Review dispute response body is required', 'BUSINESS_RULE')
  }

  return PR.allow()
}

export function canAddReviewDisputeEvidence(ctx: {
  disputeStatus: string
  evidenceType: string | null | undefined
  url: string | null | undefined
  isParticipant: boolean
}): PolicyResult {
  if (!ctx.isParticipant) {
    return PR.deny('Only dispute participants can add evidence', 'FORBIDDEN')
  }

  if (!isActiveReviewDisputeStatus(ctx.disputeStatus)) {
    return PR.deny('Review dispute is not active', 'BUSINESS_RULE')
  }

  if (!ctx.evidenceType || ctx.evidenceType.trim().length === 0) {
    return PR.deny('Review dispute evidence type is required', 'BUSINESS_RULE')
  }

  if (!ctx.url || ctx.url.trim().length === 0) {
    return PR.deny('Review dispute evidence url is required', 'BUSINESS_RULE')
  }

  return PR.allow()
}

export function canTransitionDisputeStatus(from: string, to: string): PolicyResult {
  if (from === to) {
    return PR.allow()
  }

  const terminalStates = new Set(['resolved', 'rejected', 'cancelled'])
  if (terminalStates.has(from)) {
    return PR.deny(`Cannot transition from terminal state: ${from}`, 'BUSINESS_RULE')
  }

  return PR.allow()
}

export interface DisputeCaseFileData {
  task: unknown
  assignment: unknown
  review: unknown
  submission: unknown
  requiredSkills?: unknown[] | null
  skillReviews?: unknown[] | null
}

export function computeDisputeCaseFileCompleteness(data: DisputeCaseFileData) {
  const missingData: string[] = []
  if (!data.task) missingData.push('task')
  if (!data.assignment) missingData.push('assignment')
  if (!data.review) missingData.push('review')
  if (!data.submission) missingData.push('submission')
  if (!data.requiredSkills || data.requiredSkills.length === 0) missingData.push('required_skills')
  if (!data.skillReviews || data.skillReviews.length === 0) missingData.push('skill_reviews')

  const score = Math.max(0, 100 - missingData.length * 10)
  return {
    completenessScore: score,
    missingData,
  }
}
