import { reviewPublicApi } from '#composition/reviews/public-api/review_public_api_composition'
import { UserReviewReader } from '#modules/users/actions/ports/outbound/user_review_reader'

export class UserReviewReaderAdapter extends UserReviewReader {
  listHistory(context: Parameters<UserReviewReader['listHistory']>[0]) {
    return reviewPublicApi.listUserReviewHistory(context)
  }

  loadReverseSummary(userId: string) {
    return reviewPublicApi.loadUserReverseReviewSummary(userId)
  }
}
