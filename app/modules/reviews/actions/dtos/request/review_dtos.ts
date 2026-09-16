import {
  MAX_SKILL_RATINGS_PER_SUBMISSION,
  SubmitSkillReviewDTO,
} from './submit_skill_review_dto.js'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { REVIEW_PAGINATION as PAGINATION } from '#modules/reviews/public_contracts/review_pagination'


export { SubmitSkillReviewDTO, MAX_SKILL_RATINGS_PER_SUBMISSION }

/**
 * CreateReviewSessionDTO
 *
 * Data for creating a new review session after task completion
 */
export class CreateReviewSessionDTO {
  declare task_assignment_id: string
  declare reviewee_id: string
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
 * ConfirmReviewDTO
 *
 * Data for confirming or disputing review results
 */
export class ConfirmReviewDTO {
  declare review_session_id: string
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
  declare review_session_id: string
  declare target_type: 'peer' | 'manager' | 'project' | 'organization'
  declare target_id: string
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
  declare review_session_id: string

  constructor(reviewSessionId: string) {
    this.review_session_id = reviewSessionId
  }
}

/**
 * GetUserReviewsDTO
 */
export class GetUserReviewsDTO {
  declare user_id: string
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

/**
 * AddReviewEvidenceDTO
 *
 * Data for attaching evidence links/files to a review session.
 */
export class AddReviewEvidenceDTO {
  declare review_session_id: string
  declare evidence_type: string
  declare url: string | null
  declare title: string | null
  declare description: string | null

  constructor(data: Partial<AddReviewEvidenceDTO>) {
    if (data.review_session_id === undefined) {
      throw new ValidationException('review_session_id is required')
    }
    if (!data.evidence_type || data.evidence_type.trim().length === 0) {
      throw new ValidationException('evidence_type is required')
    }

    const validTypes = new Set([
      'pull_request',
      'commit_link',
      'demo_recording',
      'test_report',
      'document_link',
      'ticket',
      'screenshot',
      'metrics_screenshot',
      'other',
    ])
    const normalizedType = data.evidence_type.trim()
    if (!validTypes.has(normalizedType)) {
      throw new ValidationException('evidence_type is invalid')
    }

    if (data.url && data.url.length > 600) {
      throw new ValidationException('url exceeds max length 600')
    }

    if (data.title && data.title.length > 255) {
      throw new ValidationException('title exceeds max length 255')
    }

    this.review_session_id = data.review_session_id
    this.evidence_type = normalizedType
    this.url = data.url ?? null
    this.title = data.title ?? null
    this.description = data.description ?? null
  }
}

/**
 * UpsertTaskSelfAssessmentDTO
 *
 * Data for reviewee self-assessment on completed assignment.
 */
export class UpsertTaskSelfAssessmentDTO {
  declare review_session_id: string
  declare overall_satisfaction: number | null
  declare difficulty_felt: string | null
  declare confidence_level: number | null
  declare what_went_well: string | null
  declare what_would_do_different: string | null
  declare blockers_encountered: string[]
  declare skills_felt_lacking: string[]
  declare skills_felt_strong: string[]

  constructor(data: Partial<UpsertTaskSelfAssessmentDTO>) {
    if (data.review_session_id === undefined) {
      throw new ValidationException('review_session_id is required')
    }

    const validDifficulty = new Set([
      'easier_than_expected',
      'as_expected',
      'harder_than_expected',
      'extremely_challenging',
    ])

    if (data.overall_satisfaction !== undefined && data.overall_satisfaction !== null) {
      if (data.overall_satisfaction < 1 || data.overall_satisfaction > 5) {
        throw new ValidationException('overall_satisfaction must be between 1 and 5')
      }
    }

    if (data.confidence_level !== undefined && data.confidence_level !== null) {
      if (data.confidence_level < 1 || data.confidence_level > 5) {
        throw new ValidationException('confidence_level must be between 1 and 5')
      }
    }

    if (data.difficulty_felt && !validDifficulty.has(data.difficulty_felt)) {
      throw new ValidationException('difficulty_felt is invalid')
    }

    this.review_session_id = data.review_session_id
    this.overall_satisfaction = data.overall_satisfaction ?? null
    this.difficulty_felt = data.difficulty_felt ?? null
    this.confidence_level = data.confidence_level ?? null
    this.what_went_well = data.what_went_well ?? null
    this.what_would_do_different = data.what_would_do_different ?? null
    this.blockers_encountered = data.blockers_encountered ?? []
    this.skills_felt_lacking = data.skills_felt_lacking ?? []
    this.skills_felt_strong = data.skills_felt_strong ?? []
  }
}
