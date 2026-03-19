import type {
  SelfAssessmentAccuracyDisputeSource,
  SelfAssessmentAccuracyFactSourceReader,
  SelfAssessmentAccuracySource,
} from '#modules/reviews/actions/ports/outbound/review_fact_source_readers'
import type { ReviewTransaction } from '#modules/reviews/actions/ports/outbound/review_transaction'
import { latestRevieweeConfirmationAction } from '#modules/reviews/domain/review_confirmation_rules'
import {
  evaluateSelfAssessmentAccuracyEligibility,
  resolveSelfAssessmentAccuracyPeriod,
} from '#modules/reviews/domain/self_assessment_accuracy_eligibility'
import { ACTIVE_REVIEW_DISPUTE_STATUSES } from '#modules/reviews/public_contracts/review_constants'
import type {
  SelfAssessmentAccuracyFactV1,
  SelfAssessmentAccuracyPeriodV1,
} from '#modules/reviews/public_contracts/self_assessment_accuracy_fact_v1'

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

export default class ListSelfAssessmentAccuracyFactsV1Query {
  constructor(private readonly sources: SelfAssessmentAccuracyFactSourceReader) {}

  async execute(
    userId: string,
    period: SelfAssessmentAccuracyPeriodV1,
    trx?: ReviewTransaction
  ): Promise<SelfAssessmentAccuracyFactV1[]> {
    const resolvedPeriod = resolveSelfAssessmentAccuracyPeriod(period)
    if (!UUID_PATTERN.test(userId) || !resolvedPeriod.valid) return []

    const { sources: sourceRows, disputes: disputeRows } = await this.sources.load(userId, trx)
    const sourceRowsByAssignment = groupBy(sourceRows, (row) => row.task_assignment_id)
    const disputeRowsBySession = groupBy(disputeRows, (row) => row.review_session_id)
    const facts: SelfAssessmentAccuracyFactV1[] = []

    for (const assignmentRows of sourceRowsByAssignment.values()) {
      if (assignmentRows.length !== 1) continue

      const row = assignmentRows[0] as SelfAssessmentAccuracySource
      const sessionDisputes = disputeRowsBySession.get(row.review_session_id) ?? []
      const latestDispute: SelfAssessmentAccuracyDisputeSource | null =
        sessionDisputes[0] ?? null
      const eligibility = evaluateSelfAssessmentAccuracyEligibility(
        {
          sessionStatus: row.session_status,
          revieweeAction: latestRevieweeConfirmationAction(row.confirmations, userId),
          hasActiveDispute: sessionDisputes.some((dispute) =>
            ACTIVE_DISPUTE_STATUSES.has(dispute.status)
          ),
          latestDisputeStatus: latestDispute?.status ?? null,
          latestFinalDecision: latestDispute?.final_decision ?? null,
          selfScore: row.self_score,
          reviewedScore: row.reviewed_score,
          reviewCompletedAt: row.review_completed_at,
        },
        resolvedPeriod
      )

      if (!eligibility.eligible) continue

      facts.push({
        taskAssignmentId: row.task_assignment_id,
        selfScore: eligibility.selfScore,
        reviewedScore: eligibility.reviewedScore,
        reviewCompletedAt: eligibility.reviewCompletedAt,
      })
    }

    return facts
  }
}
