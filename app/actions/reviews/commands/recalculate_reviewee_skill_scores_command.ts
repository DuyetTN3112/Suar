import emitter from '@adonisjs/core/services/emitter'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import { BaseCommand } from '#actions/shared/base_command'
import {
  calculateSkillConfidence,
  calculateSkillWeightedScore,
  mapWeightedScoreToLevelCode,
} from '#domain/reviews/review_formulas'
import ReviewMetricsRepository from '#infra/reviews/repositories/review_metrics_repository'
import type { DatabaseId } from '#types/database'

import { DefaultReviewDependencies } from '../ports/review_external_dependencies_impl.js'

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

    })
  }
}
