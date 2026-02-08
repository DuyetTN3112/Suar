import type { UserReviewHistoryDirection } from '#modules/reviews/public_contracts/user_review_history'

export interface ReviewTaskReceivedHistorySource {
  workflow_id: string
  task_id: string
  task_title: string
  project_id: string
  project_name: string | null
  status: string
  completed_review_count: number | string | null
  required_review_count: number | string | null
  updated_at: unknown
  last_reviewed_at: unknown
}

export interface ReviewTaskSentHistorySource {
  message_id: string
  task_id: string
  task_title: string
  project_id: string
  project_name: string | null
  reviewee_name: string | null
  reviewee_email: string | null
  status: string
  body: string | null
  created_at: unknown
}

export interface ReviewSprintReverseHistorySource {
  workflow_id: string
  sprint_id: string
  sprint_name: string | null
  project_id: string
  project_name: string | null
  target_type: 'assigner' | 'environment'
  target_user_name: string | null
  target_user_email: string | null
  status: string
  rating: number | string | null
  comment: string | null
  submitted_at: unknown
  updated_at: unknown
}

export interface ReviewUserHistoryReader {
  listTaskReviewsReceived(userId: string): Promise<ReviewTaskReceivedHistorySource[]>

  listTaskReviewsSent(userId: string): Promise<ReviewTaskSentHistorySource[]>

  listSprintReverseReviews(
    direction: UserReviewHistoryDirection,
    userId: string
  ): Promise<ReviewSprintReverseHistorySource[]>
}
