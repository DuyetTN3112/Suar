import { type ReverseReviewTargetType as ReverseReviewTarget } from '#modules/reviews/public_contracts/review_constants'

export type ReverseReviewTargetType = `${ReverseReviewTarget}`

export interface ReverseReviewTargetStatsRecord {
  target_type: ReverseReviewTargetType
  target_id: string
  total_reviews: number
  average_rating: number | null
  anonymous_reviews: number
  last_review_at: string | null
}

export interface ReverseReviewPersonSummary {
  total_reviews: number
  average_rating: number | null
  peer_reviews: number
  manager_reviews: number
  anonymous_reviews: number
  last_review_at: string | null
}
