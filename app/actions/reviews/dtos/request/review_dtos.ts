import { PAGINATION } from '#constants/common_constants'
import ValidationException from '#exceptions/validation_exception'
import type { DatabaseId } from '#types/database'

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
  declare quality_metrics: {
    overall_quality_score: number | null
    delivery_timeliness: string | null
    requirement_adherence: number | null
    communication_quality: number | null
    code_quality_score: number | null
    proactiveness_score: number | null
    would_work_with_again: boolean | null
  }
  declare overall_quality_score: number | null
  declare delivery_timeliness: string | null
  declare requirement_adherence: number | null
  declare communication_quality: number | null
  declare code_quality_score: number | null
  declare proactiveness_score: number | null
  declare would_work_with_again: boolean | null
  declare strengths_observed: string | null
  declare areas_for_improvement: string | null

  static fromSubmission(data: Partial<SubmitSkillReviewDTO>): SubmitSkillReviewDTO {
    return new SubmitSkillReviewDTO(data)
  }

  static forReviewer(
    reviewerType: 'manager' | 'peer',
    payload: {
      review_session_id: DatabaseId
      skill_ratings: SubmitSkillReviewDTO['skill_ratings']
      quality_metrics?: SubmitSkillReviewDTO['quality_metrics']
      strengths_observed?: string | null
      areas_for_improvement?: string | null
    }
  ): SubmitSkillReviewDTO {
    return new SubmitSkillReviewDTO({
      review_session_id: payload.review_session_id,
      reviewer_type: reviewerType,
      skill_ratings: payload.skill_ratings,
      quality_metrics: payload.quality_metrics,
      strengths_observed: payload.strengths_observed,
      areas_for_improvement: payload.areas_for_improvement,
    })
  }

  static forManager(payload: {
    review_session_id: DatabaseId
    skill_ratings: SubmitSkillReviewDTO['skill_ratings']
    quality_metrics?: SubmitSkillReviewDTO['quality_metrics']
    strengths_observed?: string | null
    areas_for_improvement?: string | null
  }): SubmitSkillReviewDTO {
    return SubmitSkillReviewDTO.forReviewer('manager', payload)
  }

  static forPeer(payload: {
    review_session_id: DatabaseId
    skill_ratings: SubmitSkillReviewDTO['skill_ratings']
    quality_metrics?: SubmitSkillReviewDTO['quality_metrics']
    strengths_observed?: string | null
    areas_for_improvement?: string | null
  }): SubmitSkillReviewDTO {
    return SubmitSkillReviewDTO.forReviewer('peer', payload)
  }

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

    const qualityMetrics = data.quality_metrics ?? {
      overall_quality_score: data.overall_quality_score ?? null,
      delivery_timeliness: data.delivery_timeliness ?? null,
      requirement_adherence: data.requirement_adherence ?? null,
      communication_quality: data.communication_quality ?? null,
      code_quality_score: data.code_quality_score ?? null,
      proactiveness_score: data.proactiveness_score ?? null,
      would_work_with_again: data.would_work_with_again ?? null,
    }

    this.quality_metrics = qualityMetrics
    this.overall_quality_score = qualityMetrics.overall_quality_score
    this.delivery_timeliness = qualityMetrics.delivery_timeliness
    this.requirement_adherence = qualityMetrics.requirement_adherence
    this.communication_quality = qualityMetrics.communication_quality
    this.code_quality_score = qualityMetrics.code_quality_score
    this.proactiveness_score = qualityMetrics.proactiveness_score
    this.would_work_with_again = qualityMetrics.would_work_with_again
    this.strengths_observed = data.strengths_observed ?? null
    this.areas_for_improvement = data.areas_for_improvement ?? null
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

/**
 * AddReviewEvidenceDTO
 *
 * Data for attaching evidence links/files to a review session.
 */
export class AddReviewEvidenceDTO {
  declare review_session_id: DatabaseId
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
  declare review_session_id: DatabaseId
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
