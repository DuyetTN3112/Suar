import type { ReviewCachePort } from './review_cache_port.js'

import cacheService from '#infra/cache/cache_service'
import type { DatabaseId } from '#types/database'


const invalidateUserReviewData = async (userId: DatabaseId): Promise<void> => {
  await cacheService.deleteByPattern(`*spider:user:${userId}*`)
  await cacheService.deleteByPattern(`*skill_scores:user:${userId}*`)
}

export const reviewCachePortImpl: ReviewCachePort = {
  async invalidateReview(reviewId: DatabaseId): Promise<void> {
    await cacheService.deleteByPattern(`*review:${reviewId}*`)
  },

  async invalidateUserReviewData(userId: DatabaseId): Promise<void> {
    await invalidateUserReviewData(userId)
  },

  async invalidateUserProfileReviewData(userId: DatabaseId): Promise<void> {
    await invalidateUserReviewData(userId)
    await cacheService.deleteByPattern(`*user:profile:${userId}*`)
    await cacheService.deleteByPattern(`*profile:snapshot:current*${userId}*`)
  },
}
