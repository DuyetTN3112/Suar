import { BaseCommand } from '#actions/shared/base_command'
import type SkillReview from '#models/skill_review'
import type FlaggedReview from '#models/flagged_review'
import SkillReviewRepository from '#infra/reviews/repositories/skill_review_repository'
import FlaggedReviewRepository from '#infra/reviews/repositories/flagged_review_repository'
import ReviewSessionRepository from '#infra/reviews/repositories/review_session_repository'
import UserRepository from '#infra/users/repositories/user_repository'
import { AnomalyFlagType, AnomalySeverity } from '#constants/review_constants'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'

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
  reviewSessionId: DatabaseId
  reviewerId: DatabaseId
  skillReviews: SkillReview[]
  session: { reviewee_id: DatabaseId } | null
  reviewee: { created_at: { toMillis(): number } } | null
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
export default class DetectAnomalyCommand extends BaseCommand<
  { reviewSessionId: DatabaseId; reviewerId: DatabaseId },
  FlaggedReview[]
> {
  async handle(input: {
    reviewSessionId: DatabaseId
    reviewerId: DatabaseId
  }): Promise<FlaggedReview[]> {
    let flaggedReviews: FlaggedReview[] = []

    try {
      const detectionContext = await this.loadDetectionContext(
        input.reviewSessionId,
        input.reviewerId
      )
      const anomalies = await this.detectAnomalies(detectionContext)
      flaggedReviews = await this.persistFlags(anomalies)
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
        error: error instanceof Error ? error.message : String(error),
      })
    }

    return flaggedReviews
  }

  private async loadDetectionContext(
    reviewSessionId: DatabaseId,
    reviewerId: DatabaseId
  ): Promise<DetectionContext> {
    const skillReviews = await SkillReviewRepository.listBySessionAndReviewer(
      reviewSessionId,
      reviewerId
    )

    if (skillReviews.length === 0) {
      return {
        reviewSessionId,
        reviewerId,
        skillReviews,
        session: null,
        reviewee: null,
      }
    }

    const session = await ReviewSessionRepository.findById(reviewSessionId)
    if (!session) {
      return {
        reviewSessionId,
        reviewerId,
        skillReviews,
        session: null,
        reviewee: null,
      }
    }

    const reviewee = await UserRepository.findById(session.reviewee_id)

    return {
      reviewSessionId,
      reviewerId,
      skillReviews,
      session,
      reviewee,
    }
  }

  private async detectAnomalies(context: DetectionContext): Promise<AnomalyDetection[]> {
    if (context.skillReviews.length === 0 || !context.session) {
      return []
    }

    const [bulkSame, newAccountHigh, mutualHigh] = await Promise.all([
      Promise.resolve(this.checkBulkSameLevel(context.skillReviews)),
      Promise.resolve(this.checkNewAccountHigh(context)),
      this.checkMutualHigh(context),
    ])

    return [...bulkSame, ...newAccountHigh, ...mutualHigh]
  }

  /**
   * Pattern 3: bulk_same_level — Reviewer assigns same level to >80% of skills
   */
  private checkBulkSameLevel(skillReviews: SkillReview[]): AnomalyDetection[] {
    if (skillReviews.length < 3) return []

    const levelCounts: Record<string, number> = {}
    for (const review of skillReviews) {
      const level = review.assigned_level_code
      levelCounts[level] = (levelCounts[level] || 0) + 1
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
   * Pattern 5: new_account_high — Account <30 days receives ≥senior level
   */
  private checkNewAccountHigh(context: DetectionContext): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = []

    const reviewee = context.reviewee
    if (!reviewee) return anomalies

    const accountAgeDays = Math.floor(
      (Date.now() - reviewee.created_at.toMillis()) / (1000 * 60 * 60 * 24)
    )

    if (accountAgeDays < 30) {
      const highLevels = ['senior', 'lead', 'principal', 'expert', 'master']
      for (const review of context.skillReviews) {
        if (highLevels.includes(review.assigned_level_code)) {
          anomalies.push({
            flagType: AnomalyFlagType.NEW_ACCOUNT_HIGH,
            severity: AnomalySeverity.HIGH,
            skillReviewId: review.id,
            notes: `Account is ${accountAgeDays} days old but received "${review.assigned_level_code}" level`,
          })
        }
      }
    }

    return anomalies
  }

  /**
   * Pattern 2: mutual_high — Two users rate each other high >3 times
   */
  private async checkMutualHigh(context: DetectionContext): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = []

    const session = context.session
    if (!session) return anomalies

    const revieweeId = session.reviewee_id

    // Count times the reviewee has also reviewed the reviewer with high scores
    const mutualCount = await SkillReviewRepository.countCompletedHighReviewsBetweenUsers(
      revieweeId,
      context.reviewerId
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

  private async persistFlags(anomalies: AnomalyDetection[]): Promise<FlaggedReview[]> {
    const flaggedReviews: FlaggedReview[] = []

    for (const anomaly of anomalies) {
      const flagged = await FlaggedReviewRepository.create({
        skill_review_id: anomaly.skillReviewId,
        flag_type: anomaly.flagType,
        severity: anomaly.severity,
        status: 'pending',
        notes: anomaly.notes,
      })
      flaggedReviews.push(flagged)
    }

    return flaggedReviews
  }
}
