import { BaseCommand } from '#modules/reviews/actions/base_command'
import type { ReviewCachePort } from '#modules/reviews/actions/ports/outbound/review_cache_port'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

export interface InvalidateUserReviewCacheInput {
  userId: string
}

export default class InvalidateUserReviewCacheCommand extends BaseCommand<
  InvalidateUserReviewCacheInput,
  void
> {
  constructor(
    execCtx: ReviewActionContext,
    private readonly reviewCache: ReviewCachePort
  ) {
    super(execCtx)
  }

  execute(input: InvalidateUserReviewCacheInput): Promise<void> {
    return this.handle(input)
  }

  handle(input: InvalidateUserReviewCacheInput): Promise<void> {
    return this.reviewCache.invalidateUserReviewData(input.userId)
  }
}
