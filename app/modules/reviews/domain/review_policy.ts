/**
 * Review Policy — Pure permission/business-rule functions for the review domain.
 *
 * All functions are synchronous, pure, and have 0 database dependencies.
 * They take pre-fetched context data and return PolicyResult.
 *
 * @module ReviewPolicy
 */

import type { PolicyResult } from '#modules/authorization/public_contracts/policy_result'
import { PolicyResult as PR } from '#modules/authorization/public_contracts/policy_result'

const isSameId = (a: string, b: string): boolean => a === b

// ============================================================================
// Review Session
// ============================================================================

/**
 * Check if a review session can be created for a task assignment.
 *
 * Rules:
 * 1. Assignment must be COMPLETED
 * 2. No existing review session for this assignment
 */
export function canCreateReviewSession(ctx: {
  assignmentStatus: string
  existingSessionId: string | null
}): PolicyResult {
  if (ctx.assignmentStatus !== 'completed') {
    return PR.deny('Chỉ có thể tạo review session cho assignment đã hoàn thành', 'BUSINESS_RULE')
  }

  if (ctx.existingSessionId !== null) {
    return PR.deny('Review session đã tồn tại cho assignment này', 'BUSINESS_RULE')
  }

  return PR.allow()
}

// ============================================================================
// Review Confirmation
// ============================================================================

/**
 * Check if a reviewee can confirm/dispute a review session.
 *
 * Rules:
 * 1. Session must be COMPLETED
 * 2. Actor must be the reviewee
 * 3. Actor must not have already confirmed/disputed
 */
export function canConfirmReview(ctx: {
  sessionStatus: string
  sessionRevieweeId: string
  actorId: string
  existingConfirmationUserIds: string[]
}): PolicyResult {
  if (ctx.sessionStatus !== 'completed' && ctx.sessionStatus !== 'disputed') {
    return PR.deny('Chỉ có thể xác nhận review session đã hoàn thành', 'BUSINESS_RULE')
  }

  if (!isSameId(ctx.actorId, ctx.sessionRevieweeId)) {
    return PR.deny('Chỉ người được đánh giá mới có thể xác nhận review')
  }

  const alreadyConfirmed = ctx.existingConfirmationUserIds.some((id) => isSameId(id, ctx.actorId))
  if (alreadyConfirmed) {
    return PR.deny('Bạn đã xác nhận hoặc tranh chấp review này rồi', 'BUSINESS_RULE')
  }

  return PR.allow()
}

// ============================================================================
// Credibility Counter Resolution
// ============================================================================

/**
 * Resolve credibility counters after a confirmation/dispute action.
 *
 * Pure calculation: given the action and current counters, return the new counters.
 */
export function resolveConfirmationCounters(
  action: 'confirmed' | 'disputed',
  currentCounters: { accurate: number; disputed: number; total: number }
): { accurate: number; disputed: number; total: number } {
  const newTotal = currentCounters.total + 1

  if (action === 'confirmed') {
    return {
      accurate: currentCounters.accurate + 1,
      disputed: currentCounters.disputed,
      total: newTotal,
    }
  }

  return {
    accurate: currentCounters.accurate,
    disputed: currentCounters.disputed + 1,
    total: newTotal,
  }
}

/**
 * Check whether review session exists for authorization-sensitive flows.
 * This is the basic existence check — kept for backward compatibility.
 */
export function canAccessReviewSession(ctx: { sessionExists: boolean }): PolicyResult {
  if (ctx.sessionExists) return PR.allow()

  return PR.deny('Review session không tồn tại')
}

/**
 * Actor-aware review session access check.
 *
 * Access is granted if ANY of the following is true:
 * 1. Session does not exist → deny
 * 2. Actor is system admin → allow
 * 3. Actor is the reviewee → allow
 * 4. Actor is a manager reviewer on this session → allow
 * 5. Actor is a peer reviewer on this session → allow
 * 6. Actor is org admin/owner of the task's org → allow
 */
export function canAccessReviewSessionAsActor(ctx: {
  sessionExists: boolean
  actorId: string
  actorSystemRole: string | null
  sessionRevieweeId: string
  sessionTaskOrgId: string
  managerReviewerIds: string[]
  peerReviewerIds: string[]
  isOrgAdminOrOwner: boolean
}): PolicyResult {
  if (!ctx.sessionExists) {
    return PR.deny('Review session không tồn tại')
  }

  // System admin can access any session
  if (ctx.actorSystemRole === 'system_admin' || ctx.actorSystemRole === 'superadmin') {
    return PR.allow()
  }

  // Reviewee can access their own session
  if (isSameId(ctx.actorId, ctx.sessionRevieweeId)) {
    return PR.allow()
  }

  // Manager reviewer on this session
  if (ctx.managerReviewerIds.some((id) => isSameId(id, ctx.actorId))) {
    return PR.allow()
  }

  // Peer reviewer on this session
  if (ctx.peerReviewerIds.some((id) => isSameId(id, ctx.actorId))) {
    return PR.allow()
  }

  // Org admin/owner of the task's organization
  if (ctx.isOrgAdminOrOwner) {
    return PR.allow()
  }

  return PR.deny('Bạn không có quyền truy cập review session này', 'FORBIDDEN')
}

/**
 * Check whether an actor can submit a review for a session.
 *
 * Rules:
 * 1. System admin → allow (can submit as any type)
 * 2. Actor is a manager reviewer → allow only if reviewer_type = 'manager'
 * 3. Actor is a peer reviewer → allow only if reviewer_type = 'peer'
 * 4. Reviewee cannot submit review for themselves
 * 5. Unrelated user → deny
 *
 * This prevents reviewer_type spoofing (e.g., peer claiming to be manager).
 */
export function canSubmitReview(ctx: {
  actorId: string
  actorSystemRole: string | null
  sessionRevieweeId: string
  sessionTaskOrgId: string
  managerReviewerIds: string[]
  peerReviewerIds: string[]
  isOrgAdminOrOwner: boolean
  reviewerType: 'manager' | 'peer'
}): PolicyResult {
  // System admin can submit as any type
  if (ctx.actorSystemRole === 'system_admin' || ctx.actorSystemRole === 'superadmin') {
    return PR.allow()
  }

  // Reviewee cannot submit review for themselves
  if (isSameId(ctx.actorId, ctx.sessionRevieweeId)) {
    return PR.deny('Người được đánh giá không thể tự submit review', 'FORBIDDEN')
  }

  // Manager reviewer can only submit as manager
  if (ctx.managerReviewerIds.some((id) => isSameId(id, ctx.actorId))) {
    if (ctx.reviewerType !== 'manager') {
      return PR.deny('Bạn không có quyền submit với reviewer type này', 'FORBIDDEN')
    }
    return PR.allow()
  }

  // Peer reviewer can only submit as peer
  if (ctx.peerReviewerIds.some((id) => isSameId(id, ctx.actorId))) {
    if (ctx.reviewerType !== 'peer') {
      return PR.deny('Bạn không có quyền submit với reviewer type này', 'FORBIDDEN')
    }
    return PR.allow()
  }

  // Org admin/owner can submit as manager
  if (ctx.isOrgAdminOrOwner && ctx.reviewerType === 'manager') {
    return PR.allow()
  }

  return PR.deny('Bạn không có quyền submit review cho session này', 'FORBIDDEN')
}

/**
 * Check whether actor can submit/update self assessment in a review session.
 */
export function canUpsertTaskSelfAssessment(ctx: {
  actorId: string
  sessionRevieweeId: string
  hasRevieweeOutcome: boolean
}): PolicyResult {
  if (!isSameId(ctx.actorId, ctx.sessionRevieweeId)) {
    return PR.deny('Chỉ reviewee mới được tự đánh giá')
  }

  if (ctx.hasRevieweeOutcome) {
    return PR.deny('Không thể sửa tự đánh giá sau khi đã xác nhận hoặc tranh chấp review', 'BUSINESS_RULE')
  }

  return PR.allow()
}

/**
 * Check whether actor can attach evidence to a review session.
 */
export function canAddReviewEvidence(ctx: {
  actorId: string
  sessionRevieweeId: string
  hasSubmittedReview: boolean
}): PolicyResult {
  if (isSameId(ctx.actorId, ctx.sessionRevieweeId) || ctx.hasSubmittedReview) {
    return PR.allow()
  }

  return PR.deny('Bạn không có quyền thêm evidence cho review này')
}
