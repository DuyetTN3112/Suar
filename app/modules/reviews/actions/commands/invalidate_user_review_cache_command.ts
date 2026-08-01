import type { ReviewCachePort } from '#modules/reviews/actions/ports/outbound/review_cache_port'

export interface InvalidateUserReviewCacheInput {
  userId: string
}

export default class InvalidateUserReviewCacheCommand {
  constructor(private readonly reviewCache: ReviewCachePort) {}

  execute(input: InvalidateUserReviewCacheInput): Promise<void> {
    return this.reviewCache.invalidateUserReviewData(input.userId)
  }
}
