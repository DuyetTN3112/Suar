import emitter from '@adonisjs/core/services/emitter'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import { DefaultReviewDependencies } from '../ports/review_external_dependencies_impl.js'

import { auditPublicApi } from '#actions/audit/public_api'
import { BaseCommand } from '#actions/reviews/base_command'
import ReviewMetricsRepository from '#infra/reviews/repositories/review_metrics_repository'
import {
  calculateSkillConfidence,
  calculateSkillWeightedScore,
  mapWeightedScoreToLevelCode,
} from '#modules/reviews/domain/review_formulas'
import type { DatabaseId } from '#types/database'

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
    const roundedAverage = computed.avgPercentage

    return DefaultReviewDependencies.userSkill.upsertReviewedSkillScore(
      userId,
      skillId,
      {
        levelCode: computed.levelCode,
        totalReviews: reviews.length,
        avgScore: roundedAverage,
        avgPercentage: roundedAverage,
        lastReviewedAt: computed.mostRecentReviewAt,
      },
      trx
    )
  }

  private async logSkillRecalculationAudit(
    userId: DatabaseId,
    skillId: string,
    totalReviews: number,
    computed: ComputedSkillScore
  ): Promise<void> {
    if (this.execCtx.userId) {
      await auditPublicApi.write(this.execCtx, {
        user_id: this.execCtx.userId,
        action: 'recalculate_user_skill_score',
        entity_type: 'user_skill',
        entity_id: userId,
        old_values: null,
        new_values: {
          skill_id: skillId,
          weighted_score: Math.round(computed.weightedScore * 100) / 100,
          avg_percentage: computed.avgPercentage,
          confidence_score: computed.confidence,
          total_reviews: totalReviews,
        },
      })
    }
  }
}
