import CalculatePerformanceScoreCommand from './commands/calculate_performance_score_command.js'
import CalculateTrustScoreCommand from './commands/calculate_trust_score_command.js'
import RecalculateRevieweeSkillScoresCommand, {
  type SkillScoreUpdatedEventPayload,
} from './commands/recalculate_reviewee_skill_scores_command.js'
import UpdateReviewerCredibilityCommand from './commands/update_reviewer_credibility_command.js'

import type { TransactionalAuditDeferralOptions } from '#modules/reviews/actions/dtos/request/transactional_audit_options'
import type { ReviewExternalDependencies } from '#modules/reviews/actions/ports/outbound/review_external_dependencies'
import type { ReviewExternalEffectPublisher } from '#modules/reviews/actions/ports/outbound/review_external_effects'
import type { ReviewMetricsReader } from '#modules/reviews/actions/ports/outbound/review_metrics_reader'
import type { ReviewTransaction } from '#modules/reviews/actions/ports/outbound/review_transaction'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import {
  PROFILE_UPDATE_ACTION,
  REVIEWER_CREDIBILITY_ACTION,
  type ProfileUpdateAction,
  type ReviewerCredibilityAction,
} from '#modules/reviews/public_contracts/review_constants'

export interface ReputationProjectionOptions extends TransactionalAuditDeferralOptions {
  signal?: AbortSignal
}

export interface ReputationProjectionResult {
  skillScoreUpdated: SkillScoreUpdatedEventPayload[]
}

/**
 * ReputationProjector
 *
 * Dedicated projector that computes read-model projections (Trust Score,
 * Reviewer Credibility, Performance Score, and Reviewed Skill Levels)
 * from confirmed review and resolved dispute events.
 */
export class ReputationProjector {
  constructor(
    private readonly dependencies: Pick<
      ReviewExternalDependencies,
      'organization' | 'user' | 'userSkill'
    >,
    private readonly metricsReader: ReviewMetricsReader,
    private readonly externalEffects: Pick<ReviewExternalEffectPublisher, 'emitSkillScoreUpdated'>
  ) {}

  async projectReviewConfirmed(
    input: {
      revieweeId: string
      reviewerIds: readonly string[]
      action: string
      confirmedBy: string
    },
    execCtx: ReviewActionContext,
    trx: ReviewTransaction,
    options: ReputationProjectionOptions = {}
  ): Promise<ReputationProjectionResult> {
    options.signal?.throwIfAborted()

    let skillScoreUpdated: SkillScoreUpdatedEventPayload[] = []

    if (input.action === 'confirmed') {
      for (const reviewerId of input.reviewerIds) {
        options.signal?.throwIfAborted()
        await new UpdateReviewerCredibilityCommand(
          execCtx,
          this.dependencies.user,
          this.metricsReader
        ).handleInTransaction({ user_id: reviewerId }, trx, options.signal ? { signal: options.signal } : {})
      }

      const skillResult = await new RecalculateRevieweeSkillScoresCommand(
        execCtx,
        this.dependencies.userSkill,
        this.metricsReader,
        this.externalEffects
      ).handleInTransaction({ userId: input.revieweeId }, trx, options)
      skillScoreUpdated = [...skillResult.deferredSkillScoreUpdatedEvents]

      await new CalculatePerformanceScoreCommand(
        execCtx,
        this.dependencies.user,
        this.metricsReader
      ).handleInTransaction({ userId: input.revieweeId }, trx, options)

      await new CalculateTrustScoreCommand(
        execCtx,
        this.dependencies.organization,
        this.dependencies.user,
        this.metricsReader
      ).handleInTransaction({ userId: input.revieweeId }, trx, options)

      await this.dependencies.user.refreshProfileAggregates(input.revieweeId, execCtx, {
        trx,
        ...options,
      })
    }

    return { skillScoreUpdated }
  }

  async projectDisputeResolved(
    input: {
      revieweeId: string
      reviewerIds: readonly string[]
      reviewerCredibilityAction?: ReviewerCredibilityAction | null | undefined
      profileUpdateAction?: ProfileUpdateAction | null | undefined
      resolvedBy: string
    },
    execCtx: ReviewActionContext,
    trx: ReviewTransaction,
    options: ReputationProjectionOptions = {}
  ): Promise<ReputationProjectionResult> {
    options.signal?.throwIfAborted()

    if (input.reviewerCredibilityAction === REVIEWER_CREDIBILITY_ACTION.MARK_DISPUTED) {
      for (const reviewerId of input.reviewerIds) {
        options.signal?.throwIfAborted()
        await new UpdateReviewerCredibilityCommand(
          execCtx,
          this.dependencies.user,
          this.metricsReader
        ).handleInTransaction({ user_id: reviewerId }, trx, options.signal ? { signal: options.signal } : {})
      }
    }

    let skillScoreUpdated: SkillScoreUpdatedEventPayload[] = []
    if (input.profileUpdateAction === PROFILE_UPDATE_ACTION.RECALCULATE) {
      const skillResult = await new RecalculateRevieweeSkillScoresCommand(
        execCtx,
        this.dependencies.userSkill,
        this.metricsReader,
        this.externalEffects
      ).handleInTransaction({ userId: input.revieweeId }, trx, options)
      skillScoreUpdated = [...skillResult.deferredSkillScoreUpdatedEvents]

      await new CalculatePerformanceScoreCommand(
        execCtx,
        this.dependencies.user,
        this.metricsReader
      ).handleInTransaction({ userId: input.revieweeId }, trx, options)

      await new CalculateTrustScoreCommand(
        execCtx,
        this.dependencies.organization,
        this.dependencies.user,
        this.metricsReader
      ).handleInTransaction({ userId: input.revieweeId }, trx, options)

      await this.dependencies.user.refreshProfileAggregates(input.revieweeId, execCtx, {
        trx,
        ...options,
      })
    }

    return { skillScoreUpdated }
  }
}
