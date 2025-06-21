import emitter from '@adonisjs/core/services/emitter'
import loggerService from '#services/logger_service'
import cacheService from '#services/cache_service'
import { ExecutionContext } from '#types/execution_context'
import type {
  ReviewSubmittedEvent,
  ReviewConfirmedEvent,
  SkillScoreUpdatedEvent,
} from '#events/event_types'

/**
 * Review Listener — Sprint 7
 *
 * Handles review lifecycle events:
 *   1. review:submitted — Invalidate spider chart cache, trigger recalculation
 *   2. review:confirmed — Recalculate reviewer credibility + reviewee scores/trust
 *   3. skill:score:updated — Invalidate spider chart cache
 */

// === Review Submitted ===
emitter.on('review:submitted', async (event: ReviewSubmittedEvent) => {
  try {
    // Invalidate spider chart cache for the reviewee
    await cacheService.deleteByPattern(`*spider:user:${event.revieweeId}*`)
    await cacheService.deleteByPattern(`*skill_scores:user:${event.revieweeId}*`)

    loggerService.debug('Review submitted — spider chart cache invalidated', {
      reviewSessionId: event.reviewSessionId,
      revieweeId: event.revieweeId,
      reviewerId: event.reviewerId,
      scoreCount: Object.keys(event.scores).length,
    })

    // Auto-trigger anomaly detection
    try {
      const { default: DetectAnomalyCommand } =
        await import('#actions/reviews/commands/detect_anomaly_command')
      const command = new DetectAnomalyCommand(ExecutionContext.system(event.reviewerId))
      await command.handle({
        reviewSessionId: event.reviewSessionId,
        reviewerId: event.reviewerId,
      })
    } catch (anomalyError) {
      loggerService.error('ReviewListener: anomaly detection failed', {
        reviewSessionId: event.reviewSessionId,
        error: anomalyError instanceof Error ? anomalyError.message : String(anomalyError),
      })
    }
  } catch (error) {
    loggerService.error('ReviewListener: review submitted failed', {
      reviewSessionId: event.reviewSessionId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// === Review Confirmed ===
emitter.on('review:confirmed', async (event: ReviewConfirmedEvent) => {
  try {
    const { default: UpdateReviewerCredibilityCommand } =
      await import('#actions/reviews/commands/update_reviewer_credibility_command')
    const { default: RecalculateRevieweeSkillScoresCommand } =
      await import('#actions/reviews/commands/recalculate_reviewee_skill_scores_command')
    const { default: CalculateTrustScoreCommand } =
      await import('#actions/reviews/commands/calculate_trust_score_command')
    const { default: CalculatePerformanceScoreCommand } =
      await import('#actions/reviews/commands/calculate_performance_score_command')
    const { default: RefreshUserProfileAggregatesCommand } =
      await import('#actions/users/commands/refresh_user_profile_aggregates_command')

    // 1) Recompute reviewer credibility from source data to avoid drift.
    for (const reviewerId of event.reviewerIds) {
      const command = new UpdateReviewerCredibilityCommand(
        ExecutionContext.system(event.confirmedBy)
      )
      await command.handle({ user_id: reviewerId })
    }

    // 2) Recompute reviewee scores only on confirmation.
    if (event.action === 'confirmed') {
      const recalculateSkillScores = new RecalculateRevieweeSkillScoresCommand(
        ExecutionContext.system(event.confirmedBy)
      )
      await recalculateSkillScores.handle({ userId: event.revieweeId })

      const calculatePerformanceScore = new CalculatePerformanceScoreCommand(
        ExecutionContext.system(event.confirmedBy)
      )
      await calculatePerformanceScore.handle({ userId: event.revieweeId })

      const calculateTrustScore = new CalculateTrustScoreCommand(
        ExecutionContext.system(event.confirmedBy)
      )
      await calculateTrustScore.handle({ userId: event.revieweeId })

      const refreshAggregates = new RefreshUserProfileAggregatesCommand(
        ExecutionContext.system(event.confirmedBy)
      )
      await refreshAggregates.handle({
        userId: event.revieweeId,
        fullRebuild: false,
      })
    }

    // 3) Invalidate reviewee profile-related cache.
    await cacheService.deleteByPattern(`*spider:user:${event.revieweeId}*`)
    await cacheService.deleteByPattern(`*skill_scores:user:${event.revieweeId}*`)
    await cacheService.deleteByPattern(`*user:profile:${event.revieweeId}*`)
    await cacheService.deleteByPattern(`*profile:snapshot:current*${event.revieweeId}*`)

    loggerService.debug('Review confirmed pipeline executed', {
      confirmationId: event.confirmationId,
      revieweeId: event.revieweeId,
      reviewerCount: event.reviewerIds.length,
      action: event.action,
    })
  } catch (error) {
    loggerService.error('ReviewListener: review confirmed failed', {
      confirmationId: event.confirmationId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// === Skill Score Updated ===
emitter.on('skill:score:updated', async (event: SkillScoreUpdatedEvent) => {
  try {
    // Invalidate spider chart cache for the user
    await cacheService.deleteByPattern(`*spider:user:${event.userId}*`)
    await cacheService.deleteByPattern(`*skill_scores:user:${event.userId}*`)

    loggerService.debug('Skill score updated — cache invalidated', {
      userId: event.userId,
      skillId: event.skillId,
      oldScore: event.oldScore,
      newScore: event.newScore,
    })
  } catch (error) {
    loggerService.error('ReviewListener: skill score updated failed', {
      userId: event.userId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
})
