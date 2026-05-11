import { reviewPublicApi } from '#composition/reviews/public-api/review_public_api_composition'

export const closeProjectSprintReviewForTesting =
  reviewPublicApi.closeProjectSprintReview.bind(reviewPublicApi)
