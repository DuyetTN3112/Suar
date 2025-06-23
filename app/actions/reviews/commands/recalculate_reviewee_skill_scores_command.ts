import { DateTime } from 'luxon'
import { BaseCommand } from '#actions/shared/base_command'
import UserSkillRepository from '#infra/users/repositories/user_skill_repository'
import ReviewMetricsRepository from '#infra/reviews/repositories/review_metrics_repository'
import type { DatabaseId } from '#types/database'
import {
  calculateSkillConfidence,
  calculateSkillWeightedScore,
  mapWeightedScoreToLevelCode,
} from '#domain/reviews/review_formulas'
import emitter from '@adonisjs/core/services/emitter'

interface ReviewRow {
  skill_id: string
  review_session_id: string
  reviewer_type: 'manager' | 'peer'
  assigned_level_code: string
  reviewer_credibility_score: number
  created_at: string | Date
}

export interface RecalculateRevieweeSkillScoresDTO {
  userId: DatabaseId
}

export interface RecalculateRevieweeSkillScoresResult {
  userId: DatabaseId
  skillsUpdated: number
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
    return await this.executeInTransaction(async (trx) => {
      const rows = (await ReviewMetricsRepository.listCompletedSkillReviewRowsByReviewee(
        dto.userId,
        trx
      )) as unknown as ReviewRow[]

      if (rows.length === 0) {
        return { userId: dto.userId, skillsUpdated: 0 }
      }

      const evidenceRows = (await ReviewMetricsRepository.listEvidenceCountsBySkill(
        dto.userId,
        trx
      )) as unknown as Array<{
        skill_id: string
        total: number | string
      }>

      const evidenceBySkill = new Map<string, number>()
      for (const row of evidenceRows) {
        evidenceBySkill.set(row.skill_id, Number(row.total))
      }

      const bySkill = new Map<string, ReviewRow[]>()
      for (const row of rows) {
        const list = bySkill.get(row.skill_id) ?? []
        list.push(row)
        bySkill.set(row.skill_id, list)
      }

      let skillsUpdated = 0

      for (const [skillId, reviews] of bySkill.entries()) {
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
          hasManager: reviews.some((r) => r.reviewer_type === 'manager'),
          hasPeer: reviews.some((r) => r.reviewer_type === 'peer'),
          evidenceCount: evidenceBySkill.get(skillId) ?? 0,
          reviewerCredibilityAverage:
            reviews.reduce(
              (sum, r) => sum + this.toCredibilityScore(r.reviewer_credibility_score),
              0
            ) / reviews.length,
        })

        const mostRecentReviewAt =
          reviews
            .map((r) => this.toDateTime(r.created_at))
            .sort((a, b) => b.toMillis() - a.toMillis())[0] ?? null

        const existing = await UserSkillRepository.findByUserAndSkill(dto.userId, skillId, trx)

        const oldScore = existing?.avg_percentage ?? null

        if (existing) {
          existing.level_code = levelCode
          existing.total_reviews = reviews.length
          existing.avg_score = Math.round(avgPercentage * 10) / 10
          existing.avg_percentage = Math.round(avgPercentage * 10) / 10
          existing.last_calculated_at = DateTime.now()
          existing.last_reviewed_at = mostRecentReviewAt
          existing.source = 'reviewed'
          await UserSkillRepository.save(existing, trx)
        } else {
          await UserSkillRepository.create(
            {
              user_id: dto.userId,
              skill_id: skillId,
              level_code: levelCode,
              total_reviews: reviews.length,
              avg_score: Math.round(avgPercentage * 10) / 10,
              avg_percentage: Math.round(avgPercentage * 10) / 10,
              last_calculated_at: DateTime.now(),
              last_reviewed_at: mostRecentReviewAt,
              source: 'reviewed',
            },
            trx
          )
        }

        void emitter.emit('skill:score:updated', {
          userId: dto.userId,
          skillId,
          oldScore,
          newScore: Math.round(avgPercentage * 10) / 10,
        })

        await this.logAudit('recalculate_user_skill_score', 'user_skill', dto.userId, null, {
          skill_id: skillId,
          weighted_score: Math.round(weightedScore * 100) / 100,
          avg_percentage: Math.round(avgPercentage * 10) / 10,
          confidence_score: confidence,
          total_reviews: reviews.length,
        })

        skillsUpdated += 1
      }

      return {
        userId: dto.userId,
        skillsUpdated,
      }
    })
  }
}
