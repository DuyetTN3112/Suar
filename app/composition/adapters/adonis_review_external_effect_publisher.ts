import emitter from '@adonisjs/core/services/emitter'

import type { ReviewExternalEffectPublisher } from '#modules/reviews/actions/ports/outbound/review_external_effects'
import { reviewCachePortImpl } from '#modules/reviews/infra/adapters/review_cache_adapter'

export class AdonisReviewExternalEffectPublisher implements ReviewExternalEffectPublisher {
  emitSkillScoreUpdated(
    event: Parameters<ReviewExternalEffectPublisher['emitSkillScoreUpdated']>[0]
  ): Promise<void> {
    return emitter.emit('skill:score:updated', event)
  }

  invalidateUserProfileReviewData(revieweeId: string): Promise<void> {
    return reviewCachePortImpl.invalidateUserProfileReviewData(revieweeId)
  }

  publishTalentProjection(
    event: Parameters<ReviewExternalEffectPublisher['publishTalentProjection']>[0]
  ): Promise<void> {
    return emitter.emit('reviews:talent-explainability-projection:changed:v1', event)
  }
}
