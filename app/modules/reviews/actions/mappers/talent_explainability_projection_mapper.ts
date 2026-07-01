import type {
  TalentExplainabilityRatingSource,
  TalentExplainabilitySourceSnapshot,
} from '#modules/reviews/actions/ports/outbound/review_fact_source_readers'
import { evaluateProfileReviewEligibility } from '#modules/reviews/domain/review-core/profile_review_eligibility'
import { latestRevieweeConfirmationAction } from '#modules/reviews/domain/review-core/review_confirmation_rules'
import { ACTIVE_REVIEW_DISPUTE_STATUSES } from '#modules/reviews/public_contracts/review_constants'
import type {
  TalentConfidenceSignalV1,
  TalentExplainabilityReviewProjectionV1,
} from '#modules/reviews/public_contracts/talent_explainability_projection_v1'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ACTIVE_DISPUTE_STATUSES = new Set<string>(ACTIVE_REVIEW_DISPUTE_STATUSES)
const CONFIDENCE_SIGNALS = new Set<TalentConfidenceSignalV1>(['low', 'medium', 'high'])

function groupBy<T>(rows: T[], keyOf: (row: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>()
  for (const row of rows) {
    const key = keyOf(row)
    const current = grouped.get(key)
    if (current) {
      current.push(row)
    } else {
      grouped.set(key, [row])
    }
  }
  return grouped
}

function toTimestamp(value: Date | string | null): number {
  if (value === null) return 0
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : 0
}

function isPublishableRating(row: TalentExplainabilityRatingSource): boolean {
  return row.review_status === 'submitted' && row.is_fraud === false && row.superseded_by === null
}

function toConfidenceSignal(value: string | null): TalentConfidenceSignalV1 | null {
  return value !== null && CONFIDENCE_SIGNALS.has(value as TalentConfidenceSignalV1)
    ? (value as TalentConfidenceSignalV1)
    : null
}

function compareRatingsByRecency(
  left: TalentExplainabilityRatingSource,
  right: TalentExplainabilityRatingSource
): number {
  const submittedDifference = toTimestamp(right.submitted_at) - toTimestamp(left.submitted_at)
  if (submittedDifference !== 0) return submittedDifference

  const createdDifference = toTimestamp(right.created_at) - toTimestamp(left.created_at)
  if (createdDifference !== 0) return createdDifference

  return right.id.localeCompare(left.id)
}

export function collectTalentExplainabilityProjectionUserIds(revieweeUserIds: string[]): {
  uniqueUserIds: string[]
  validUserIds: string[]
} {
  const uniqueUserIds = [...new Set(revieweeUserIds)]
  return {
    uniqueUserIds,
    validUserIds: uniqueUserIds.filter((userId) => UUID_PATTERN.test(userId)),
  }
}

export function buildTalentExplainabilityProjectionsV1(
  revieweeUserIds: string[],
  source: TalentExplainabilitySourceSnapshot
): TalentExplainabilityReviewProjectionV1[] {
  const sessionsByUser = groupBy(source.sessions, (row) => row.reviewee_id)
  const disputesBySession = groupBy(source.disputes, (row) => row.review_session_id)
  const ratingsBySession = groupBy(source.ratings, (row) => row.review_session_id)

  return revieweeUserIds.map((revieweeUserId) => {
    const userSessions = sessionsByUser.get(revieweeUserId) ?? []
    const userDisputes = userSessions.flatMap((session) => disputesBySession.get(session.id) ?? [])
    const userRatings = userSessions.flatMap((session) => ratingsBySession.get(session.id) ?? [])
    const activeDisputedSessionIds = new Set(
      userDisputes
        .filter((dispute) => ACTIVE_DISPUTE_STATUSES.has(dispute.status))
        .map((dispute) => dispute.review_session_id)
    )
    const underDisputeSkillIds = new Set(
      userRatings
        .filter(
          (rating) =>
            activeDisputedSessionIds.has(rating.review_session_id) && isPublishableRating(rating)
        )
        .map((rating) => rating.skill_id)
    )

    const eligibleSessionIds = new Set(
      userSessions
        .filter((session) => {
          const sessionDisputes = disputesBySession.get(session.id) ?? []
          const latestDispute = sessionDisputes[0] ?? null
          return evaluateProfileReviewEligibility({
            sessionStatus: session.status,
            revieweeAction: latestRevieweeConfirmationAction(session.confirmations, revieweeUserId),
            hasActiveDispute: sessionDisputes.some((dispute) =>
              ACTIVE_DISPUTE_STATUSES.has(dispute.status)
            ),
            latestDisputeStatus: latestDispute?.status ?? null,
            latestFinalDecision: latestDispute?.final_decision ?? null,
          }).eligible
        })
        .map((session) => session.id)
    )
    const latestConfidenceSignal =
      userRatings
        .filter(
          (rating) =>
            eligibleSessionIds.has(rating.review_session_id) &&
            isPublishableRating(rating) &&
            toConfidenceSignal(rating.confidence) !== null
        )
        .sort(compareRatingsByRecency)
        .map((rating) => toConfidenceSignal(rating.confidence))[0] ?? null

    return {
      contractVersion: 1,
      revieweeUserId,
      underDisputeSkillsCount: underDisputeSkillIds.size,
      latestConfidenceSignal,
      sourceRevision: source.revision,
    }
  })
}
