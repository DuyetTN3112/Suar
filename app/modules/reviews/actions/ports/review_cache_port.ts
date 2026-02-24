
export interface ReviewCachePort {
  invalidateReview(reviewId: string): Promise<void>
  invalidateUserReviewData(userId: string): Promise<void>
  invalidateUserProfileReviewData(userId: string): Promise<void>
}
