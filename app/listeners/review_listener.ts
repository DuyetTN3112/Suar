import emitter from '@adonisjs/core/services/emitter'
import loggerService from '#services/logger_service'
import cacheService from '#services/cache_service'
import type {
  ReviewSubmittedEvent,
  ReviewConfirmedEvent,
  SkillScoreUpdatedEvent,
} from '#events/index'

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
    // Update reviewer credibility — increment accurate reviews count
    const { default: ReviewerCredibility } = await import('#models/reviewer_credibility')

    const credibility = await ReviewerCredibility.query().where('user_id', event.reviewerId).first()

    if (credibility) {
      credibility.accurate_reviews = (credibility.accurate_reviews ?? 0) + 1
      await credibility.save()
    } else {
      await ReviewerCredibility.create({
        user_id: String(event.reviewerId),
        accurate_reviews: 1,
        total_reviews_given: 0,
        disputed_reviews: 0,
        credibility_score: 50,
      })
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
