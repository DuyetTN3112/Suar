import type { ReviewCachePort } from './review_cache_port.js'

import { cacheStore } from '#modules/cache/public_contracts/cache_store'


const invalidateUserReviewData = async (userId: string): Promise<void> => {
  await cacheStore.deleteByPattern(`*spider:user:${userId}*`)
  await cacheStore.deleteByPattern(`*skill_scores:user:${userId}*`)
}

export const reviewCachePortImpl: ReviewCachePort = {
  async invalidateReview(reviewId: string): Promise<void> {
    await cacheStore.deleteByPattern(`*review:${reviewId}*`)
  },

  async invalidateUserReviewData(userId: string): Promise<void> {
    await invalidateUserReviewData(userId)
  },

  async invalidateUserProfileReviewData(userId: string): Promise<void> {
    await invalidateUserReviewData(userId)
    await cacheStore.deleteByPattern(`*user:profile:${userId}*`)
    await cacheStore.deleteByPattern(`*profile:snapshot:current*${userId}*`)
  },
}
