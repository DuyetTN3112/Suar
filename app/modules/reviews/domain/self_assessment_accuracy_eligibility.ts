import { evaluateProfileReviewEligibility } from '#modules/reviews/domain/profile_review_eligibility'
import type { SelfAssessmentAccuracyPeriodV1 } from '#modules/reviews/public_contracts/self_assessment_accuracy_fact_v1'

export type ResolvedSelfAssessmentAccuracyPeriod =
  | {
      valid: true
      periodStartMillis: number | null
      periodEndMillis: number | null
    }
  | {
      valid: false
    }

export interface SelfAssessmentAccuracyEligibilityInput {
  sessionStatus: string
  revieweeAction: 'confirmed' | 'disputed' | null
  hasActiveDispute: boolean
  latestDisputeStatus: string | null
  latestFinalDecision: string | null
  selfScore: number | string | null
  reviewedScore: number | string | null
  reviewCompletedAt: Date | string | null
}

export type SelfAssessmentAccuracyEligibility =
  | {
      eligible: true
      selfScore: number
      reviewedScore: number
      reviewCompletedAt: string
    }
  | {
      eligible: false
    }

function parsePeriodBoundary(value: string | null | undefined): number | null | undefined {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string' || value.trim() === '') return undefined

  const millis = Date.parse(value)
  return Number.isFinite(millis) ? millis : undefined
}

function toScore(value: number | string | null): number | null {
  if (value === null || (typeof value === 'string' && value.trim() === '')) return null
  const score = Number(value)
  return Number.isFinite(score) ? score : null
}

function toDate(value: Date | string | null): { millis: number; iso: string } | null {
  if (value === null) return null
  const date = value instanceof Date ? value : new Date(value)
  const millis = date.getTime()
  return Number.isFinite(millis) ? { millis, iso: date.toISOString() } : null
}

export function resolveSelfAssessmentAccuracyPeriod(
  period: SelfAssessmentAccuracyPeriodV1
): ResolvedSelfAssessmentAccuracyPeriod {
  const periodStartMillis = parsePeriodBoundary(period.periodStart)
  const periodEndMillis = parsePeriodBoundary(period.periodEnd)

  if (periodStartMillis === undefined || periodEndMillis === undefined) {
    return { valid: false }
  }

  if (
    periodStartMillis !== null &&
    periodEndMillis !== null &&
    periodStartMillis > periodEndMillis
  ) {
    return { valid: false }
  }

  return {
    valid: true,
    periodStartMillis,
    periodEndMillis,
  }
}

/**
 * Reviews owns whether self-assessment accuracy data may leave the module.
 * Unknown states, invalid scores/dates, and out-of-period rows fail closed.
 */
export function evaluateSelfAssessmentAccuracyEligibility(
  input: SelfAssessmentAccuracyEligibilityInput,
  period: Extract<ResolvedSelfAssessmentAccuracyPeriod, { valid: true }>
): SelfAssessmentAccuracyEligibility {
  const reviewEligibility = evaluateProfileReviewEligibility({
    sessionStatus: input.sessionStatus,
    revieweeAction: input.revieweeAction,
    hasActiveDispute: input.hasActiveDispute,
    latestDisputeStatus: input.latestDisputeStatus,
    latestFinalDecision: input.latestFinalDecision,
  })

  if (!reviewEligibility.eligible) return { eligible: false }

  const selfScore = toScore(input.selfScore)
  const reviewedScore = toScore(input.reviewedScore)
  const completedAt = toDate(input.reviewCompletedAt)
  if (selfScore === null || reviewedScore === null || completedAt === null) {
    return { eligible: false }
  }

  if (
    (period.periodStartMillis !== null && completedAt.millis < period.periodStartMillis) ||
    (period.periodEndMillis !== null && completedAt.millis > period.periodEndMillis)
  ) {
    return { eligible: false }
  }

  return {
    eligible: true,
    selfScore,
    reviewedScore,
    reviewCompletedAt: completedAt.iso,
  }
}
