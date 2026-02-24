export interface ReviewUserProfileProjectionInput {
  reviewSessionId: string
  reviewedUserId: string
  reviewerUserId: string
  completedAt: string
}

export interface ReviewUserProfileProjection {
  updateFromCompletedReview(input: ReviewUserProfileProjectionInput): Promise<void>
}
