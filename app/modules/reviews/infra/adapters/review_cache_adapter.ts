import { reviewSessionCacheKey } from '#modules/cache/public_contracts/cache_contract'
import { cacheInvalidationStore } from '#modules/cache/public_contracts/cache_store'
import type { ReviewCachePort } from '#modules/reviews/actions/ports/outbound/review_cache_port'

interface ReviewCacheStore {
  delete(key: string): Promise<void>
  deleteByPattern(pattern: string): Promise<void>
}

export function createReviewCachePort(
  store: ReviewCacheStore = cacheInvalidationStore
): ReviewCachePort {
  const invalidateUserReviewData = async (userId: string): Promise<void> => {
    await store.delete(`users:spider_chart:v4:${userId}`)
  }

  return {
    async invalidateReview(reviewId: string): Promise<void> {
      await store.delete(reviewSessionCacheKey(reviewId))
    },

    async invalidatePendingReviews(userId: string): Promise<void> {
      await store.deleteByPattern(`user:pending_reviews:*:userId:${userId}`)
    },

    async invalidateUserReviewData(userId: string): Promise<void> {
      await invalidateUserReviewData(userId)
    },

    async invalidateUserProfileReviewData(userId: string): Promise<void> {
      await Promise.all([
        invalidateUserReviewData(userId),
        store.deleteByPattern(`users:featured_reviews:v2:${userId}:*`),
        store.delete(`users:delivery_metrics:${userId}`),
      ])
    },
  }
}

export const reviewCachePortImpl = createReviewCachePort()
