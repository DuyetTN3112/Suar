import { DateTime } from 'luxon'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type { TransactionalAuditDeferralOptions } from '#modules/reviews/actions/dtos/request/transactional_audit_options'
import type { ReviewUserSkillWriter } from '#modules/reviews/actions/ports/outbound/review_external_dependencies'
import type { ReviewExternalEffectPublisher } from '#modules/reviews/actions/ports/outbound/review_external_effects'
import type {
  ReviewMetricsReader,
  ReviewSkillAggregationRow,
} from '#modules/reviews/actions/ports/outbound/review_metrics_reader'
import type {
  ReviewTransaction,
  ReviewTransactionRunner,
} from '#modules/reviews/actions/ports/outbound/review_transaction'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import {
  calculateSkillConfidence,
  calculateSkillWeightedScore,
  mapWeightedScoreToLevelCode,
  SKILL_AGGREGATION_SCORING_VERSION,
} from '#modules/reviews/domain/review-core/review_formulas'
import type { SkillScoreUpdatedEvent } from '#modules/skills/public_contracts/skill_events'

export interface RecalculateRevieweeSkillScoresDTO {
  userId: string
}

export interface RecalculateRevieweeSkillScoresResult {
  userId: string
  skillsUpdated: number
}

export type SkillScoreUpdatedEventPayload = Readonly<SkillScoreUpdatedEvent>

export interface RecalculateRevieweeSkillScoresTransactionResult
  extends RecalculateRevieweeSkillScoresResult {
  /**
   * Events produced by committed database changes. A caller that owns the
   * transaction must publish these only after that transaction commits.
   */
  readonly deferredSkillScoreUpdatedEvents: readonly SkillScoreUpdatedEventPayload[]
}

export interface RecalculateRevieweeSkillScoresTransactionOptions
  extends TransactionalAuditDeferralOptions {
  signal?: AbortSignal
}

interface LoadedSkillReviews {
  reviews: ReviewSkillAggregationRow[]
  evidenceBySkill: Map<string, number>
}

interface ComputedSkillScore {
  weightedScore: number
  levelCode: string
  avgPercentage: number
  confidence: number
  evidenceCount: number
  mostRecentReviewAt: DateTime | null
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
  constructor(
    execCtx: ReviewActionContext,
    private readonly userSkillWriter: ReviewUserSkillWriter,
    private readonly metricsReader: ReviewMetricsReader,
    private readonly externalEffects: Pick<ReviewExternalEffectPublisher, 'emitSkillScoreUpdated'>,
    transactions?: ReviewTransactionRunner
  ) {
    super(execCtx, transactions)
  }

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
    const result = await this.executeInTransaction((trx) => this.handleInTransaction(dto, trx))

    for (const eventPayload of result.deferredSkillScoreUpdatedEvents) {
      await this.settlePostCommitEffect(
        'review.skill_score.updated',
        () => this.externalEffects.emitSkillScoreUpdated(eventPayload),
        {
          entityId: eventPayload.skillId,
          actorId: this.execCtx.userId ?? dto.userId,
        }
      )
    }

    return {
      userId: result.userId,
      skillsUpdated: result.skillsUpdated,
    }
  }

  async handleInTransaction(
    dto: RecalculateRevieweeSkillScoresDTO,
    trx: ReviewTransaction,
    options: RecalculateRevieweeSkillScoresTransactionOptions = {}
  ): Promise<RecalculateRevieweeSkillScoresTransactionResult> {
    options.signal?.throwIfAborted()

    const loaded = await this.loadSkillReviews(dto.userId, trx)

    if (loaded.reviews.length === 0) {
      options.signal?.throwIfAborted()
      return {
        userId: dto.userId,
        skillsUpdated: 0,
        deferredSkillScoreUpdatedEvents: [],
      }
    }

    const groupedReviews = this.groupReviewsBySkill(loaded.reviews)
    const deferredSkillScoreUpdatedEvents: SkillScoreUpdatedEventPayload[] = []
    let skillsUpdated = 0

    for (const [skillId, reviews] of groupedReviews.entries()) {
      const computed = this.computeSkillScore(reviews, loaded.evidenceBySkill.get(skillId) ?? 0)

      options.signal?.throwIfAborted()
      const persisted = await this.persistUserSkill(dto.userId, skillId, reviews, computed, trx)

      deferredSkillScoreUpdatedEvents.push({
        userId: dto.userId,
        skillId,
        oldScore: persisted.oldScore,
        newScore: computed.avgPercentage,
      })

      options.signal?.throwIfAborted()
      const auditWrite = () =>
        this.logSkillRecalculationAudit(dto.userId, skillId, reviews.length, computed, trx)
      if (options.deferAuditWrite) {
        options.deferAuditWrite(auditWrite)
      } else {
        await auditWrite()
      }

      skillsUpdated += 1
    }

    options.signal?.throwIfAborted()
    return {
      userId: dto.userId,
      skillsUpdated,
      deferredSkillScoreUpdatedEvents,
    }
  }

  private async loadSkillReviews(
    userId: string,
    trx: ReviewTransaction
  ): Promise<LoadedSkillReviews> {
    const reviews = await this.metricsReader.listCompletedSkillReviewRowsByReviewee(
      userId,
      trx
    )

    if (reviews.length === 0) {
      return { reviews, evidenceBySkill: new Map<string, number>() }
    }

    const evidenceRows = await this.metricsReader.listEvidenceCountsBySkill(
      userId,
      trx
    )

    const evidenceBySkill = new Map<string, number>()
    for (const row of evidenceRows) {
      evidenceBySkill.set(row.skill_id, Number(row.total))
    }

    return { reviews, evidenceBySkill }
  }

  private groupReviewsBySkill(
    reviews: ReviewSkillAggregationRow[]
  ): Map<string, ReviewSkillAggregationRow[]> {
    const grouped = new Map<string, ReviewSkillAggregationRow[]>()

    for (const review of reviews) {
      const list = grouped.get(review.skill_id) ?? []
      list.push(review)
      grouped.set(review.skill_id, list)
    }

    return grouped
  }

  private computeSkillScore(
    reviews: ReviewSkillAggregationRow[],
    evidenceCount: number
  ): ComputedSkillScore {
    const weightedScore = calculateSkillWeightedScore(
      reviews.map((review) => ({
        levelCode: review.assigned_public_proficiency_code,
        reviewerType: review.reviewer_type,
        reviewerCredibilityScore: this.toCredibilityScore(review.reviewer_credibility_score),
        monthsAgo: this.toMonthsAgo(review.created_at),
      }))
    )

    const levelCode = mapWeightedScoreToLevelCode(weightedScore)
    const avgPercentage = Math.max(0, Math.min(100, ((weightedScore - 1) / 14) * 100))
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
      evidenceCount,
      mostRecentReviewAt,
    }
  }

  private async persistUserSkill(
    userId: string,
    skillId: string,
    reviews: ReviewSkillAggregationRow[],
    computed: ComputedSkillScore,
    trx: ReviewTransaction
  ): Promise<PersistedUserSkillResult> {
    const roundedAverage = computed.avgPercentage

    return this.userSkillWriter.upsertReviewedSkillScore(
      userId,
      skillId,
      {
        levelCode: computed.levelCode,
        totalReviews: reviews.length,
        avgScore: roundedAverage,
        avgPercentage: roundedAverage,
        confidence: computed.confidence,
        evidenceCount: computed.evidenceCount,
        lastReviewedAt: computed.mostRecentReviewAt,
      },
      trx
    )
  }

  private async logSkillRecalculationAudit(
    userId: string,
    skillId: string,
    totalReviews: number,
    computed: ComputedSkillScore,
    trx: ReviewTransaction
  ): Promise<void> {
    if (this.execCtx.userId) {
      await auditPublicApi.write(
        this.execCtx,
        {
          user_id: this.execCtx.userId,
          action: 'recalculate_user_skill_score',
          critical: true,
          entity_type: 'user_skill',
          entity_id: userId,
          old_values: null,
          new_values: {
            scoring_version: SKILL_AGGREGATION_SCORING_VERSION,
            skill_id: skillId,
            weighted_score: Math.round(computed.weightedScore * 100) / 100,
            avg_percentage: computed.avgPercentage,
            confidence_score: computed.confidence,
            total_reviews: totalReviews,
          },
        },
        trx
      )
    }
  }
}
