import type {
  ReviewCompletedV1,
  ReviewSubmittedV1,
} from '#modules/reviews/public_contracts/review_completed_v1'

export type ReviewPublicEventV1 = ReviewSubmittedV1 | ReviewCompletedV1

export interface ReviewEventPublisher {
  publish(event: ReviewPublicEventV1): Promise<void>
}
