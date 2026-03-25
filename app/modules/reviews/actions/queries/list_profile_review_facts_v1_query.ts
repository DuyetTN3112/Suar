import type {
  ProfileReviewDisputeSource,
  ProfileReviewEvidenceSource,
  ProfileReviewFactSourceReader,
  ProfileReviewSessionSource,
  ProfileReviewSkillRatingSource,
} from '#modules/reviews/actions/ports/outbound/review_fact_source_readers'
import type { ReviewTransaction } from '#modules/reviews/actions/ports/outbound/review_transaction'
import { evaluateProfileReviewEligibility } from '#modules/reviews/domain/profile_review_eligibility'
import { latestRevieweeConfirmationAction } from '#modules/reviews/domain/review_confirmation_rules'
import type {
  ProfileReviewFactV1,
  ProfileReviewReplacementFactV1,
  ProfileReviewTombstoneFactV1,
} from '#modules/reviews/public_contracts/profile_review_fact_v1'
import { ACTIVE_REVIEW_DISPUTE_STATUSES } from '#modules/reviews/public_contracts/review_constants'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ACTIVE_DISPUTE_STATUSES = new Set<string>(ACTIVE_REVIEW_DISPUTE_STATUSES)

function groupBy<T>(rows: T[], keyOf: (row: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>()
  for (const row of rows) {
    const key = keyOf(row)
    const values = grouped.get(key)
    if (values) {
      values.push(row)
    } else {
      grouped.set(key, [row])
    }
  }
  return grouped
}

function toTimestamp(value: Date | string): number {
  const millis = value instanceof Date ? value.getTime() : Date.parse(value)
  return Number.isFinite(millis) ? millis : 0
}

function latestSourceTimestamp(
  session: ProfileReviewSessionSource,
  disputes: ProfileReviewDisputeSource[],
  ratings: ProfileReviewSkillRatingSource[],
  evidences: ProfileReviewEvidenceSource[]
): string | null {
  const timestamps = [
    session.updated_at,
    ...disputes.map((row) => row.updated_at),
    ...ratings.map((row) => row.updated_at),
    ...evidences.map((row) => row.updated_at),
  ]
  const latest = Math.max(...timestamps.map(toTimestamp))
  return latest > 0 ? new Date(latest).toISOString() : null
}

function toQualityScore(value: number | string | null): number | null {
  if (value === null) return null
  const score = Number(value)
  return Number.isFinite(score) ? score : null
}

function missingSessionTombstone(
  revieweeUserId: string,
  taskAssignmentId: string
): ProfileReviewTombstoneFactV1 {
  return {
    contractVersion: 1,
    disposition: 'tombstone',
    reason: 'review_session_missing',
    taskAssignmentId,
    revieweeUserId,
    reviewSessionId: null,
    sourceUpdatedAt: null,
  }
}

export default class ListProfileReviewFactsV1Query {
  constructor(private readonly sources: ProfileReviewFactSourceReader) {}

  async execute(
    revieweeUserId: string,
    taskAssignmentIds: string[],
    trx?: ReviewTransaction
  ): Promise<ProfileReviewFactV1[]> {
    const uniqueAssignmentIds = [...new Set(taskAssignmentIds)]
    if (uniqueAssignmentIds.length === 0) return []

    const validAssignmentIds = uniqueAssignmentIds.filter((id) => UUID_PATTERN.test(id))
    const { sessions, disputes, ratings, evidences } = UUID_PATTERN.test(revieweeUserId)
      ? await this.sources.load(revieweeUserId, validAssignmentIds, trx)
      : { sessions: [], disputes: [], ratings: [], evidences: [] }

    const sessionsByAssignment = groupBy(sessions, (row) => row.task_assignment_id)
    const disputesBySession = groupBy(disputes, (row) => row.review_session_id)
    const ratingsBySession = groupBy(ratings, (row) => row.review_session_id)
    const evidencesBySession = groupBy(evidences, (row) => row.review_session_id)

    return uniqueAssignmentIds.map((taskAssignmentId) => {
      const assignmentSessions = sessionsByAssignment.get(taskAssignmentId) ?? []
      if (assignmentSessions.length === 0) {
        return missingSessionTombstone(revieweeUserId, taskAssignmentId)
      }

      if (assignmentSessions.length > 1) {
        return {
          contractVersion: 1,
          disposition: 'tombstone',
          reason: 'multiple_review_sessions',
          taskAssignmentId,
          revieweeUserId,
          reviewSessionId: null,
          sourceUpdatedAt: new Date(
            Math.max(...assignmentSessions.map((row) => toTimestamp(row.updated_at)))
          ).toISOString(),
        } satisfies ProfileReviewTombstoneFactV1
      }

      const session = assignmentSessions[0]
      if (!session) {
        return missingSessionTombstone(revieweeUserId, taskAssignmentId)
      }
      const sessionDisputes = disputesBySession.get(session.id) ?? []
      const sessionRatings = ratingsBySession.get(session.id) ?? []
      const sessionEvidences = evidencesBySession.get(session.id) ?? []
      const latestDispute = sessionDisputes[0] ?? null
      const eligibility = evaluateProfileReviewEligibility({
        sessionStatus: session.status,
        revieweeAction: latestRevieweeConfirmationAction(
          session.confirmations,
          revieweeUserId
        ),
        hasActiveDispute: sessionDisputes.some((row) => ACTIVE_DISPUTE_STATUSES.has(row.status)),
        latestDisputeStatus: latestDispute?.status ?? null,
        latestFinalDecision: latestDispute?.final_decision ?? null,
      })
      const sourceUpdatedAt = latestSourceTimestamp(
        session,
        sessionDisputes,
        sessionRatings,
        sessionEvidences
      )

      if (!eligibility.eligible) {
        return {
          contractVersion: 1,
          disposition: 'tombstone',
          reason: eligibility.reason,
          taskAssignmentId,
          revieweeUserId,
          reviewSessionId: session.id,
          sourceUpdatedAt,
        } satisfies ProfileReviewTombstoneFactV1
      }

      return {
        contractVersion: 1,
        disposition: 'replacement',
        reason: eligibility.reason,
        taskAssignmentId,
        revieweeUserId,
        reviewSessionId: session.id,
        sourceUpdatedAt,
        overallQualityScore: toQualityScore(session.overall_quality_score),
        skillRatings: sessionRatings
          .filter(
            (row) =>
              row.review_status === 'submitted' &&
              row.is_fraud === false &&
              row.superseded_by === null &&
              (row.reviewer_type === 'manager' || row.reviewer_type === 'peer')
          )
          .map((row) => ({
            skillReviewId: row.id,
            skillId: row.skill_id,
            assignedPublicProficiencyCode: row.assigned_public_proficiency_code,
            reviewerType: row.reviewer_type as 'manager' | 'peer',
          })),
        evidences: sessionEvidences
          .filter(
            (row) => row.verification_status === 'verified' && row.is_sensitive === false
          )
          .map((row) => ({
            evidenceId: row.id,
            evidenceType: row.evidence_type,
            url: row.url,
            title: row.title,
          })),
      } satisfies ProfileReviewReplacementFactV1
    })
  }
}
