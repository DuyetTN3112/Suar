import emitter from '@adonisjs/core/services/emitter'
import loggerService from '#services/logger_service'
import cacheService from '#services/cache_service'
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
 *   2. review:confirmed — Update reviewer credibility score
 *   3. skill:score:updated — Invalidate spider chart cache
 */

// === Review Submitted ===
emitter.on('review:submitted', async (event: ReviewSubmittedEvent) => {
  try {
    // Invalidate spider chart cache for the reviewee
    await cacheService.deleteByPattern(`*spider:user:${String(event.revieweeId)}*`)
    await cacheService.deleteByPattern(`*skill_scores:user:${String(event.revieweeId)}*`)

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
      // DetectAnomalyCommand needs HttpContext — create minimal stub for background execution
      const command = new DetectAnomalyCommand({} as any)
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
    // v3.0: reviewer_credibility model deleted — update users.credibility_data JSONB directly
    const { default: User } = await import('#models/user')

    const user = await User.find(event.reviewerId)

    if (user) {
      const credData = user.credibility_data ?? {
        credibility_score: 50,
        total_reviews_given: 0,
        accurate_reviews: 0,
        disputed_reviews: 0,
        last_calculated_at: null,
      }

      credData.accurate_reviews = (credData.accurate_reviews ?? 0) + 1
      credData.last_calculated_at = new Date().toISOString()

      user.credibility_data = credData
      await user.save()
    }

    loggerService.debug('Reviewer credibility updated', {
      confirmationId: event.confirmationId,
      reviewerId: event.reviewerId,
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
    await cacheService.deleteByPattern(`*spider:user:${String(event.userId)}*`)
    await cacheService.deleteByPattern(`*skill_scores:user:${String(event.userId)}*`)

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
