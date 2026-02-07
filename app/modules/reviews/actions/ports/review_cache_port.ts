import type { DatabaseId } from '#types/database'

export interface ReviewCachePort {
  invalidateReview(reviewId: DatabaseId): Promise<void>
  invalidateUserReviewData(userId: DatabaseId): Promise<void>
  invalidateUserProfileReviewData(userId: DatabaseId): Promise<void>
}
