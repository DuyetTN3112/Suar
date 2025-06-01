import type { DatabaseId } from '#types/database'
import ValidationException from '#exceptions/validation_exception'
import { PAGINATION } from '#constants/common_constants'

/**
 * CreateReviewSessionDTO
 *
 * Data for creating a new review session after task completion
 */
export class CreateReviewSessionDTO {
  declare task_assignment_id: DatabaseId
  declare reviewee_id: DatabaseId
  declare required_peer_reviews: number

  constructor(data: Partial<CreateReviewSessionDTO>) {
    if (data.task_assignment_id === undefined) {
      throw new ValidationException('task_assignment_id is required')
    }
    if (data.reviewee_id === undefined) {
      throw new ValidationException('reviewee_id is required')
    }
    this.task_assignment_id = data.task_assignment_id
    this.reviewee_id = data.reviewee_id
    this.required_peer_reviews = data.required_peer_reviews ?? 2
  }
}

/**
 * SubmitSkillReviewDTO
 *
 * Data for submitting skill reviews
 */
export class SubmitSkillReviewDTO {
  declare review_session_id: DatabaseId
  declare reviewer_type: 'manager' | 'peer'
  declare skill_ratings: {
    skill_id: DatabaseId
    assigned_level_code: string
    comment?: string
  }[]

  constructor(data: Partial<SubmitSkillReviewDTO>) {
    if (data.review_session_id === undefined) {
      throw new ValidationException('review_session_id is required')
    }
    if (data.reviewer_type === undefined) {
      throw new ValidationException('reviewer_type is required')
    }
    this.review_session_id = data.review_session_id
    this.reviewer_type = data.reviewer_type
    this.skill_ratings = data.skill_ratings ?? []
  }
}

/**
 * ConfirmReviewDTO
 *
 * Data for confirming or disputing review results
 */
export class ConfirmReviewDTO {
  declare review_session_id: DatabaseId
  declare action: 'confirmed' | 'disputed'
  declare dispute_reason: string | null

  constructor(data: Partial<ConfirmReviewDTO>) {
    if (data.review_session_id === undefined) {
      throw new ValidationException('review_session_id is required')
    }
    if (data.action === undefined) {
      throw new ValidationException('action is required')
    }
    this.review_session_id = data.review_session_id
    this.action = data.action
    this.dispute_reason = data.dispute_reason ?? null
  }
}

/**
 * SubmitReverseReviewDTO
 *
 * Data for submitting reverse feedback (reviewee rating reviewers)
 */
export class SubmitReverseReviewDTO {
  declare review_session_id: DatabaseId
  declare target_type: 'peer' | 'manager' | 'project' | 'organization'
  declare target_id: DatabaseId
  declare rating: number
  declare comment: string | null
  declare is_anonymous: boolean

  constructor(data: Partial<SubmitReverseReviewDTO>) {
    if (data.review_session_id === undefined) {
      throw new ValidationException('review_session_id is required')
    }
    if (data.target_type === undefined) {
      throw new ValidationException('target_type is required')
    }
    if (data.target_id === undefined) {
      throw new ValidationException('target_id is required')
    }
    if (data.rating === undefined) {
      throw new ValidationException('rating is required')
    }
    this.review_session_id = data.review_session_id
    this.target_type = data.target_type
    this.target_id = data.target_id
    this.rating = data.rating
    this.comment = data.comment ?? null
    this.is_anonymous = data.is_anonymous ?? false
  }
}

/**
 * GetReviewSessionDTO
 */
export class GetReviewSessionDTO {
  declare review_session_id: DatabaseId

  constructor(reviewSessionId: DatabaseId) {
    this.review_session_id = reviewSessionId
  }
}

/**
 * GetUserReviewsDTO
 */
export class GetUserReviewsDTO {
  declare user_id: DatabaseId
  declare page: number
  declare per_page: number

  constructor(data: Partial<GetUserReviewsDTO>) {
    if (data.user_id === undefined) {
      throw new ValidationException('user_id is required')
    }
    this.user_id = data.user_id
    this.page = data.page ?? 1
    this.per_page = data.per_page ?? PAGINATION.DEFAULT_PER_PAGE
  }
}
