import type { ReverseReviewPersonSummary } from '#modules/reviews/public_contracts/reverse_review_stats'
import type { UserReviewHistoryResult } from '#modules/reviews/public_contracts/user_review_history'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

export abstract class UserReviewReader {
  abstract listHistory(context: UserActionContext): Promise<UserReviewHistoryResult>
  abstract loadReverseSummary(userId: string): Promise<ReverseReviewPersonSummary | null>
}
