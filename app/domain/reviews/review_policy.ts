/**
 * Review Policy — Pure permission/business-rule functions for the review domain.
 *
 * All functions are synchronous, pure, and have 0 database dependencies.
 * They take pre-fetched context data and return PolicyResult.
 *
 * @module ReviewPolicy
 */

import type { PolicyResult } from '#domain/shared/policy_result'
import { PolicyResult as PR } from '#domain/shared/policy_result'
import type { DatabaseId } from '#types/database'
import { isSameId } from '#domain/shared/id_utils'

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
  existingSessionId: DatabaseId | null
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
  sessionRevieweeId: DatabaseId
  actorId: DatabaseId
  existingConfirmationUserIds: DatabaseId[]
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
