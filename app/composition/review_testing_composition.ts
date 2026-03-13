import { reviewPublicApi } from '#composition/review_public_api_composition'

export const closeProjectSprintReviewForTesting =
  reviewPublicApi.closeProjectSprintReview.bind(reviewPublicApi)
