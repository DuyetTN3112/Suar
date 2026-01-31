/**
 * CreateReviewSessionDTO
 *
 * Data for creating a new review session after task completion
 */
export class CreateReviewSessionDTO {
  declare task_assignment_id: number
  declare reviewee_id: number
  declare required_peer_reviews: number

  constructor(data: Partial<CreateReviewSessionDTO>) {
    if (data.task_assignment_id === undefined) {
      throw new Error('task_assignment_id is required')
    }
    if (data.reviewee_id === undefined) {
      throw new Error('reviewee_id is required')
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
  declare review_session_id: number
  declare reviewer_type: 'manager' | 'peer'
  declare skill_ratings: {
    skill_id: number
    assigned_level_id: number
    comment?: string
  }[]

  constructor(data: Partial<SubmitSkillReviewDTO>) {
    if (data.review_session_id === undefined) {
      throw new Error('review_session_id is required')
    }
    if (data.reviewer_type === undefined) {
      throw new Error('reviewer_type is required')
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
  declare review_session_id: number
  declare action: 'confirmed' | 'disputed'
  declare dispute_reason: string | null

  constructor(data: Partial<ConfirmReviewDTO>) {
    if (data.review_session_id === undefined) {
      throw new Error('review_session_id is required')
    }
    if (data.action === undefined) {
      throw new Error('action is required')
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
  declare review_session_id: number
  declare target_type: 'peer' | 'manager' | 'project' | 'organization'
  declare target_id: number
  declare rating: number
  declare comment: string | null
  declare is_anonymous: boolean

  constructor(data: Partial<SubmitReverseReviewDTO>) {
    if (data.review_session_id === undefined) {
      throw new Error('review_session_id is required')
    }
    if (data.target_type === undefined) {
      throw new Error('target_type is required')
    }
    if (data.target_id === undefined) {
      throw new Error('target_id is required')
    }
    if (data.rating === undefined) {
      throw new Error('rating is required')
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
  declare review_session_id: number

  constructor(reviewSessionId: number) {
    this.review_session_id = reviewSessionId
  }
}

/**
 * GetUserReviewsDTO
 */
export class GetUserReviewsDTO {
  declare user_id: number
  declare page: number
  declare per_page: number

  constructor(data: Partial<GetUserReviewsDTO>) {
    if (data.user_id === undefined) {
      throw new Error('user_id is required')
    }
    this.user_id = data.user_id
    this.page = data.page ?? 1
    this.per_page = data.per_page ?? 20
  }
}
