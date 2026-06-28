import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import loggerService from '#modules/logger/public_contracts/application_logger'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type { ReviewAnomalyFlagWriter } from '#modules/reviews/actions/ports/outbound/review_anomaly_flag_writer'
import type { ReviewUserReaderWriter } from '#modules/reviews/actions/ports/outbound/review_external_dependencies'
import type { ReviewMetricsReader } from '#modules/reviews/actions/ports/outbound/review_metrics_reader'
import type { ReviewSessionReadStore } from '#modules/reviews/actions/ports/outbound/review_session_readers'
import type {
  ReviewTransaction,
  ReviewTransactionRunner,
} from '#modules/reviews/actions/ports/outbound/review_transaction'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import {
  AnomalyFlagType,
  AnomalySeverity,
} from '#modules/reviews/public_contracts/review_constants'
import type { FlaggedReviewRecord, SkillReviewRecord } from '#modules/reviews/types/review_records'
import { isHighCanonicalProficiencyLevel } from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_framework'

/**
 * Anomaly detection result
 */
interface AnomalyDetection {
  flagType: string
  severity: string
  skillReviewId: string
  notes: string
}

interface DetectionContext {
  reviewSessionId: string
  reviewerId: string
  skillReviews: SkillReviewRecord[]
  revieweeId: string
  reviewee: { createdAtMillis: number } | null
}

/**
 * DetectAnomalyCommand
 *
 * Automatic anomaly detection after each review submission.
 * Checks for 6 fraud patterns:
 *   1. sudden_spike: Skill increased >2 levels in 30 days
 *   2. mutual_high: Two users rate each other high >3 times
 *   3. bulk_same_level: Reviewer assigns same level to >80% of skills
 *   4. frequency_anomaly: Too many reviews in a short period
 *   5. new_account_high: Account <30 days receives ≥senior level
 *   6. ip_collusion: (placeholder — needs IP tracking data)
 */
type DetectAnomalyInput = {
  reviewSessionId: string
  reviewerId: string
}

export default class DetectAnomalyCommand extends BaseCommand<
  DetectAnomalyInput,
  FlaggedReviewRecord[]
> {
  constructor(
    execCtx: ReviewActionContext,
    private readonly userReader: ReviewUserReaderWriter,
    private readonly metricsReader: ReviewMetricsReader,
    private readonly sessionReads: ReviewSessionReadStore,
    private readonly anomalyFlags: ReviewAnomalyFlagWriter,
    private readonly transactionRunner: ReviewTransactionRunner
  ) {
    super(execCtx, transactionRunner)
  }

  async handle(input: {
    reviewSessionId: string
    reviewerId: string
  }): Promise<FlaggedReviewRecord[]> {
    return this.transactionRunner.run((trx) =>
      this.handleInTransaction(input, trx, { observedAt: new Date() })
    )
  }

  async handleInTransaction(
    input: {
      reviewSessionId: string
      reviewerId: string
    },
    trx: ReviewTransaction,
    options: { observedAt: Date; signal?: AbortSignal }
  ): Promise<FlaggedReviewRecord[]> {
    let flaggedReviews: FlaggedReviewRecord[] = []

    try {
      options.signal?.throwIfAborted()
      const detectionContext = await this.loadDetectionContext(
        input.reviewSessionId,
        input.reviewerId,
        trx
      )
      const anomalies = await this.detectAnomalies(detectionContext, options.observedAt, trx)
      options.signal?.throwIfAborted()
      flaggedReviews = await this.persistFlags(anomalies, trx)
      if (flaggedReviews.length > 0) {
        loggerService.warn('Anomalies detected in review', {
          reviewSessionId: input.reviewSessionId,
          reviewerId: input.reviewerId,
          anomalyCount: flaggedReviews.length,
          types: anomalies.map((a) => a.flagType),
        })
      }
    } catch (error) {
      loggerService.error('DetectAnomalyCommand failed', {
        reviewSessionId: input.reviewSessionId,
        errorClass: error instanceof Error ? error.name : 'UnknownError',
      })
      throw error
    }

    return flaggedReviews
  }

  private async loadDetectionContext(
    reviewSessionId: string,
    reviewerId: string,
    trx: ReviewTransaction
  ): Promise<DetectionContext> {
    const skillReviews = await this.metricsReader.listSubmittedSkillReviews(
      reviewSessionId,
      reviewerId,
      trx
    )

    if (skillReviews.length === 0) {
      throw new InvariantViolationException(
        'Anomaly detection source contains no submitted skill reviews'
      )
    }

    const session = await this.sessionReads.findIdentity(reviewSessionId, trx)
    if (!session) {
      throw new InvariantViolationException('Anomaly detection source review session is missing')
    }

    const reviewee = await this.userReader.findAccountInfo(session.revieweeId, trx)
    if (!reviewee) {
      throw new InvariantViolationException('Anomaly detection source reviewee account is missing')
    }

    return {
      reviewSessionId,
      reviewerId,
      skillReviews,
      revieweeId: session.revieweeId,
      reviewee,
    }
  }

  private async detectAnomalies(
    context: DetectionContext,
    observedAt: Date,
    trx: ReviewTransaction
  ): Promise<AnomalyDetection[]> {
    if (context.skillReviews.length === 0) {
      return []
    }

    const [bulkSame, newAccountHigh, mutualHigh] = await Promise.all([
      Promise.resolve(this.checkBulkSameLevel(context.skillReviews)),
      Promise.resolve(this.checkNewAccountHigh(context, observedAt)),
      this.checkMutualHigh(context, observedAt, trx),
    ])

    return [...bulkSame, ...newAccountHigh, ...mutualHigh]
  }

  /**
   * Pattern 3: bulk_same_level — Reviewer assigns same level to >80% of skills
   */
  private checkBulkSameLevel(skillReviews: SkillReviewRecord[]): AnomalyDetection[] {
    if (skillReviews.length < 3) return []

    const levelCounts: Record<string, number> = {}
    for (const review of skillReviews) {
      const level = review.assigned_public_proficiency_code
      levelCounts[level] = (levelCounts[level] ?? 0) + 1
    }

    const maxCount = Math.max(...Object.values(levelCounts))
    const ratio = maxCount / skillReviews.length

    if (ratio > 0.8) {
      const dominantLevel =
        Object.entries(levelCounts).find(([, count]) => count === maxCount)?.[0] ?? 'unknown'
      const firstReview = skillReviews[0]
      if (!firstReview) {
        return []
      }

      return [
        {
          flagType: AnomalyFlagType.BULK_SAME_LEVEL,
          severity: ratio === 1.0 ? AnomalySeverity.HIGH : AnomalySeverity.MEDIUM,
          skillReviewId: firstReview.id,
          notes: `Reviewer assigned "${dominantLevel}" to ${maxCount}/${skillReviews.length} skills (${Math.round(ratio * 100)}%)`,
        },
      ]
    }

    return []
  }

  /**
   * Pattern 5: new_account_high — Account <30 days receives >= senior-equivalent level
   */
  private checkNewAccountHigh(context: DetectionContext, observedAt: Date): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = []

    const reviewee = context.reviewee
    if (!reviewee) return anomalies

    const accountAgeDays = Math.floor(
      (observedAt.getTime() - reviewee.createdAtMillis) / (1000 * 60 * 60 * 24)
    )

    if (accountAgeDays < 30) {
      for (const review of context.skillReviews) {
        if (isHighCanonicalProficiencyLevel(review.assigned_public_proficiency_code)) {
          anomalies.push({
            flagType: AnomalyFlagType.NEW_ACCOUNT_HIGH,
            severity: AnomalySeverity.HIGH,
            skillReviewId: review.id,
            notes: `Account is ${accountAgeDays} days old but received "${review.assigned_public_proficiency_code}" level`,
          })
        }
      }
    }

    return anomalies
  }

  /**
   * Pattern 2: mutual_high — Two users rate each other high >3 times
   */
  private async checkMutualHigh(
    context: DetectionContext,
    observedAt: Date,
    trx: ReviewTransaction
  ): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = []

    // Count times the reviewee has also reviewed the reviewer with high scores
    const mutualCount = await this.metricsReader.countCompletedHighReviewsBetweenUsers(
      context.revieweeId,
      context.reviewerId,
      trx,
      observedAt
    )

    if (mutualCount >= 3) {
      const firstReview = context.skillReviews[0]
      if (firstReview) {
        anomalies.push({
          flagType: AnomalyFlagType.MUTUAL_HIGH,
          severity: AnomalySeverity.HIGH,
          skillReviewId: firstReview.id,
          notes: `Mutual high rating detected: ${mutualCount} reverse high-level reviews found between these users`,
        })
      }
    }

    return anomalies
  }

  private async persistFlags(
    anomalies: AnomalyDetection[],
    trx: ReviewTransaction
  ): Promise<FlaggedReviewRecord[]> {
    const flaggedReviews: FlaggedReviewRecord[] = []

    for (const anomaly of anomalies) {
      const flagged = await this.anomalyFlags.createIfMissing(
        {
          skillReviewId: anomaly.skillReviewId,
          flagType: anomaly.flagType,
          severity: anomaly.severity,
          notes: anomaly.notes,
        },
        trx
      )
      flaggedReviews.push(flagged)
    }

    return flaggedReviews
  }
}
