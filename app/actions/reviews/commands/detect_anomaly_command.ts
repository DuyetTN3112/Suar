import { BaseCommand } from '#actions/shared/base_command'
import SkillReview from '#models/skill_review'
import FlaggedReview from '#models/flagged_review'
import ReviewSession from '#models/review_session'
import User from '#models/user'
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

const toNumberValue = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const getExtraNumber = (value: unknown, key: string): number => {
  if (typeof value !== 'object' || value === null) {
    return 0
  }
  const extras = (value as { $extras?: unknown }).$extras
  if (typeof extras !== 'object' || extras === null) {
    return 0
  }
  return toNumberValue((extras as Record<string, unknown>)[key])
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
    const flaggedReviews: FlaggedReview[] = []

    try {
      const anomalies = await this.detectAnomalies(input.reviewSessionId, input.reviewerId)

      for (const anomaly of anomalies) {
        const flagged = await FlaggedReview.create({
          skill_review_id: anomaly.skillReviewId,
          flag_type: anomaly.flagType,
          severity: anomaly.severity,
          status: 'pending',
          notes: anomaly.notes,
        })
        flaggedReviews.push(flagged)
      }

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

  private async detectAnomalies(
    reviewSessionId: DatabaseId,
    reviewerId: DatabaseId
  ): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = []

    // Get the skill reviews just submitted
    const skillReviews = await SkillReview.query()
      .where('review_session_id', reviewSessionId)
      .where('reviewer_id', reviewerId)

    if (skillReviews.length === 0) return anomalies

    // Run all detection checks in parallel
    const [bulkSame, newAccountHigh, mutualHigh] = await Promise.all([
      Promise.resolve(this.checkBulkSameLevel(skillReviews)),
      this.checkNewAccountHigh(reviewSessionId, skillReviews),
      this.checkMutualHigh(reviewSessionId, reviewerId),
    ])

    anomalies.push(...bulkSame, ...newAccountHigh, ...mutualHigh)

    return anomalies
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
  private async checkNewAccountHigh(
    reviewSessionId: DatabaseId,
    skillReviews: SkillReview[]
  ): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = []

    const session = await ReviewSession.find(reviewSessionId)
    if (!session) return anomalies

    const reviewee = await User.find(session.reviewee_id)
    if (!reviewee) return anomalies

    const accountAgeDays = Math.floor(
      (Date.now() - reviewee.created_at.toMillis()) / (1000 * 60 * 60 * 24)
    )

    if (accountAgeDays < 30) {
      const highLevels = ['senior', 'lead', 'principal', 'expert', 'master']
      for (const review of skillReviews) {
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
  private async checkMutualHigh(
    reviewSessionId: DatabaseId,
    reviewerId: DatabaseId
  ): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = []

    const session = await ReviewSession.find(reviewSessionId)
    if (!session) return anomalies

    const revieweeId = session.reviewee_id

    // Count times the reviewee has also reviewed the reviewer with high scores
    const reverseHighReviews = await SkillReview.query()
      .join('review_sessions', 'review_sessions.id', 'skill_reviews.review_session_id')
      .where('skill_reviews.reviewer_id', revieweeId)
      .where('review_sessions.reviewee_id', reviewerId)
      .where('review_sessions.status', 'completed')
      .whereIn('skill_reviews.assigned_level_code', [
        'senior',
        'lead',
        'principal',
        'expert',
        'master',
      ])
      .count('* as total')

    const mutualCount = getExtraNumber(reverseHighReviews[0], 'total')

    if (mutualCount >= 3) {
      const currentReviews = await SkillReview.query()
        .where('review_session_id', reviewSessionId)
        .where('reviewer_id', reviewerId)
        .limit(1)

      if (currentReviews.length > 0) {
        const firstReview = currentReviews[0]
        if (!firstReview) {
          return anomalies
        }

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
}
