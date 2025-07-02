import { DateTime } from 'luxon'
import { BaseCommand } from '#actions/shared/base_command'
import UserSkillRepository from '#infra/users/repositories/user_skill_repository'
import ReviewMetricsRepository from '#infra/reviews/repositories/review_metrics_repository'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import {
  calculateSkillConfidence,
  calculateSkillWeightedScore,
  mapWeightedScoreToLevelCode,
} from '#domain/reviews/review_formulas'
import emitter from '@adonisjs/core/services/emitter'

export interface RecalculateRevieweeSkillScoresDTO {
  userId: DatabaseId
}

export interface RecalculateRevieweeSkillScoresResult {
  userId: DatabaseId
  skillsUpdated: number
}

interface ReviewSkillRow {
  skill_id: string
  review_session_id: string
  reviewer_type: 'manager' | 'peer'
  assigned_level_code: string
  reviewer_credibility_score: number | string
  created_at: string | Date
}

interface EvidenceCountRow {
  skill_id: string
  total: number | string
}

interface SkillScoreUpdatedEventPayload {
  userId: DatabaseId
  skillId: string
  oldScore: number | null
  newScore: number
}

interface LoadedSkillReviews {
  reviews: ReviewSkillRow[]
  evidenceBySkill: Map<string, number>
}

interface ComputedSkillScore {
  weightedScore: number
  levelCode: string
  avgPercentage: number
  confidence: number
  mostRecentReviewAt: DateTime | null
}

interface RecalculateRevieweeSkillScoresTxResult {
  userId: DatabaseId
  skillsUpdated: number
  events: SkillScoreUpdatedEventPayload[]
}

interface PersistedUserSkillResult {
  oldScore: number | null
}

/**
 * RecalculateRevieweeSkillScoresCommand
 *
 * Recomputes reviewed skill levels for a user from completed review sessions
 * using weighted formulas (reviewer type, credibility, recency).
 */
export default class RecalculateRevieweeSkillScoresCommand extends BaseCommand<
  RecalculateRevieweeSkillScoresDTO,
  RecalculateRevieweeSkillScoresResult
> {
  private toCredibilityScore(value: number | string): number {
    return typeof value === 'number' ? value : Number(value)
  }

  private toMonthsAgo(value: string | Date): number {
    if (value instanceof Date) {
      return Math.max(0, DateTime.now().diff(DateTime.fromJSDate(value), 'months').months)
    }

    const parsed = DateTime.fromISO(value)
    if (parsed.isValid) {
      return Math.max(0, DateTime.now().diff(parsed, 'months').months)
    }

    return 0
  }

  private toDateTime(value: string | Date): DateTime {
    if (value instanceof Date) {
      return DateTime.fromJSDate(value)
    }

    const parsed = DateTime.fromISO(value)
    return parsed.isValid ? parsed : DateTime.now()
  }

  async handle(
    dto: RecalculateRevieweeSkillScoresDTO
  ): Promise<RecalculateRevieweeSkillScoresResult> {
    const result = await this.executeInTransaction(
      async (trx): Promise<RecalculateRevieweeSkillScoresTxResult> => {
        const loaded = await this.loadSkillReviews(dto.userId, trx)

        if (loaded.reviews.length === 0) {
          return {
            userId: dto.userId,
            skillsUpdated: 0,
            events: [],
          }
        }

        const groupedReviews = this.groupReviewsBySkill(loaded.reviews)
        const events: SkillScoreUpdatedEventPayload[] = []
        let skillsUpdated = 0

        for (const [skillId, reviews] of groupedReviews.entries()) {
          const computed = this.computeSkillScore(reviews, loaded.evidenceBySkill.get(skillId) ?? 0)
          const persisted = await this.persistUserSkill(dto.userId, skillId, reviews, computed, trx)

          events.push({
            userId: dto.userId,
            skillId,
            oldScore: persisted.oldScore,
            newScore: computed.avgPercentage,
          })

          await this.logSkillRecalculationAudit(dto.userId, skillId, reviews.length, computed)

          skillsUpdated += 1
        }

        return {
          userId: dto.userId,
          skillsUpdated,
          events,
        }
      }
    )

    for (const eventPayload of result.events) {
      void emitter.emit('skill:score:updated', eventPayload)
    }

    return {
      userId: result.userId,
      skillsUpdated: result.skillsUpdated,
    }
  }

  private async loadSkillReviews(
    userId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<LoadedSkillReviews> {
    const reviews = (await ReviewMetricsRepository.listCompletedSkillReviewRowsByReviewee(
      userId,
      trx
    )) as unknown as ReviewSkillRow[]

    if (reviews.length === 0) {
      return { reviews, evidenceBySkill: new Map<string, number>() }
    }

    const evidenceRows = (await ReviewMetricsRepository.listEvidenceCountsBySkill(
      userId,
      trx
    )) as unknown as EvidenceCountRow[]

    const evidenceBySkill = new Map<string, number>()
    for (const row of evidenceRows) {
      evidenceBySkill.set(row.skill_id, Number(row.total))
    }

    return { reviews, evidenceBySkill }
  }

  private groupReviewsBySkill(reviews: ReviewSkillRow[]): Map<string, ReviewSkillRow[]> {
    const grouped = new Map<string, ReviewSkillRow[]>()

    for (const review of reviews) {
      const list = grouped.get(review.skill_id) ?? []
      list.push(review)
      grouped.set(review.skill_id, list)
    }

    return grouped
  }

  private computeSkillScore(reviews: ReviewSkillRow[], evidenceCount: number): ComputedSkillScore {
    const weightedScore = calculateSkillWeightedScore(
      reviews.map((review) => ({
        levelCode: review.assigned_level_code,
        reviewerType: review.reviewer_type,
        reviewerCredibilityScore: this.toCredibilityScore(review.reviewer_credibility_score),
        monthsAgo: this.toMonthsAgo(review.created_at),
      }))
    )

    const levelCode = mapWeightedScoreToLevelCode(weightedScore)
    const avgPercentage = Math.max(0, Math.min(100, ((weightedScore - 1) / 7) * 100))
    const confidence = calculateSkillConfidence({
      reviewCount: reviews.length,
      hasManager: reviews.some((review) => review.reviewer_type === 'manager'),
      hasPeer: reviews.some((review) => review.reviewer_type === 'peer'),
      evidenceCount,
      reviewerCredibilityAverage:
        reviews.reduce(
          (sum, review) => sum + this.toCredibilityScore(review.reviewer_credibility_score),
          0
        ) / reviews.length,
    })

    const mostRecentReviewAt =
      reviews
        .map((review) => this.toDateTime(review.created_at))
        .sort((a, b) => b.toMillis() - a.toMillis())[0] ?? null

    return {
      weightedScore,
      levelCode,
      avgPercentage: Math.round(avgPercentage * 10) / 10,
      confidence,
      mostRecentReviewAt,
    }
  }

  private async persistUserSkill(
    userId: DatabaseId,
    skillId: string,
    reviews: ReviewSkillRow[],
    computed: ComputedSkillScore,
    trx: TransactionClientContract
  ): Promise<PersistedUserSkillResult> {
    const existing = await UserSkillRepository.findByUserAndSkill(userId, skillId, trx)
    const oldScore = existing?.avg_percentage ?? null
    const roundedAverage = computed.avgPercentage

    if (existing) {
      existing.level_code = computed.levelCode
      existing.total_reviews = reviews.length
      existing.avg_score = roundedAverage
      existing.avg_percentage = roundedAverage
      existing.last_calculated_at = DateTime.now()
      existing.last_reviewed_at = computed.mostRecentReviewAt
      existing.source = 'reviewed'
      await UserSkillRepository.save(existing, trx)
    } else {
      await UserSkillRepository.create(
        {
          user_id: userId,
          skill_id: skillId,
          level_code: computed.levelCode,
          total_reviews: reviews.length,
          avg_score: roundedAverage,
          avg_percentage: roundedAverage,
          last_calculated_at: DateTime.now(),
          last_reviewed_at: computed.mostRecentReviewAt,
          source: 'reviewed',
        },
        trx
      )
    }

    return { oldScore }
  }

  private async logSkillRecalculationAudit(
    userId: DatabaseId,
    skillId: string,
    totalReviews: number,
    computed: ComputedSkillScore
  ): Promise<void> {
    await this.logAudit('recalculate_user_skill_score', 'user_skill', userId, null, {
      skill_id: skillId,
      weighted_score: Math.round(computed.weightedScore * 100) / 100,
      avg_percentage: computed.avgPercentage,
      confidence_score: computed.confidence,
      total_reviews: totalReviews,
    })
  }
}
