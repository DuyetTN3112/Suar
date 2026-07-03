import type { ProfileReviewEligibilityReasonV1 } from '#modules/reviews/public_contracts/profile_review_fact_v1'

export interface ProfileReviewEligibilityInput {
  sessionStatus: string
  revieweeAction: 'confirmed' | 'disputed' | null
  hasActiveDispute: boolean
  latestDisputeStatus: string | null
  latestFinalDecision: string | null
}

export type ProfileReviewEligibility =
  | {
      eligible: true
      reason: Extract<
        ProfileReviewEligibilityReasonV1,
        'reviewee_confirmed' | 'resolved_dispute_publishable'
      >
    }
  | {
      eligible: false
      reason: Exclude<
        ProfileReviewEligibilityReasonV1,
        'reviewee_confirmed' | 'resolved_dispute_publishable'
      >
    }

const PUBLISHABLE_RESOLVED_DECISIONS = new Set([
  'uphold_review',
  'adjust_score',
  'dismiss_dispute',
  'partially_accept',
])

/**
 * Reviews owns the decision about whether a review may feed a profile projection.
 * Unknown and internally inconsistent states deliberately fail closed.
 */
export function evaluateProfileReviewEligibility(
  input: ProfileReviewEligibilityInput
): ProfileReviewEligibility {
  if (input.hasActiveDispute) {
    return { eligible: false, reason: 'active_dispute' }
  }

  if (input.latestFinalDecision === 'request_re_review') {
    return { eligible: false, reason: 'request_re_review' }
  }

  if (input.sessionStatus === 'completed') {
    return input.revieweeAction === 'confirmed'
      ? { eligible: true, reason: 'reviewee_confirmed' }
      : { eligible: false, reason: 'reviewee_confirmation_missing' }
  }

  if (input.sessionStatus !== 'disputed') {
    return { eligible: false, reason: 'session_not_final' }
  }

  if (!input.revieweeAction) {
    return { eligible: false, reason: 'reviewee_confirmation_missing' }
  }

  if (
    input.latestDisputeStatus === 'resolved' &&
    input.latestFinalDecision !== null &&
    PUBLISHABLE_RESOLVED_DECISIONS.has(input.latestFinalDecision)
  ) {
    return { eligible: true, reason: 'resolved_dispute_publishable' }
  }

  return { eligible: false, reason: 'dispute_not_publishable' }
}
