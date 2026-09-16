import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { isCanonicalProficiencyLevelCode } from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_framework'

export const MAX_SKILL_RATINGS_PER_SUBMISSION = 500

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * SubmitSkillReviewDTO
 *
 * Data for submitting skill reviews
 */
export class SubmitSkillReviewDTO {
  declare review_session_id: string
  declare reviewer_type: 'manager' | 'peer'
  declare skill_ratings: {
    skill_id: string
    assigned_public_proficiency_code: string
    comment?: string
    insufficient_evidence?: boolean
    observed_level_id?: string | null
    rubric_version_id?: string | null
    confidence?: 'low' | 'medium' | 'high' | null
    rationale?: string | null
    observable_behaviors?: string[]
    evidence_ids?: string[]
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
      review_session_id: string
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
      ...(payload.quality_metrics !== undefined ? { quality_metrics: payload.quality_metrics } : {}),
      ...(payload.strengths_observed !== undefined
        ? { strengths_observed: payload.strengths_observed }
        : {}),
      ...(payload.areas_for_improvement !== undefined
        ? { areas_for_improvement: payload.areas_for_improvement }
        : {}),
    })
  }

  static forManager(payload: {
    review_session_id: string
    skill_ratings: SubmitSkillReviewDTO['skill_ratings']
    quality_metrics?: SubmitSkillReviewDTO['quality_metrics']
    strengths_observed?: string | null
    areas_for_improvement?: string | null
  }): SubmitSkillReviewDTO {
    return SubmitSkillReviewDTO.forReviewer('manager', payload)
  }

  static forPeer(payload: {
    review_session_id: string
    skill_ratings: SubmitSkillReviewDTO['skill_ratings']
    quality_metrics?: SubmitSkillReviewDTO['quality_metrics']
    strengths_observed?: string | null
    areas_for_improvement?: string | null
  }): SubmitSkillReviewDTO {
    return SubmitSkillReviewDTO.forReviewer('peer', payload)
  }

  constructor(data: Partial<SubmitSkillReviewDTO>) {
    if (
      typeof data.review_session_id !== 'string' ||
      !UUID_PATTERN.test(data.review_session_id)
    ) {
      throw new ValidationException('review_session_id must be a valid UUID')
    }
    if (data.reviewer_type !== 'manager' && data.reviewer_type !== 'peer') {
      throw new ValidationException('reviewer_type must be manager or peer')
    }
    this.review_session_id = data.review_session_id
    this.reviewer_type = data.reviewer_type
    type SkillRatingInput = Omit<
      SubmitSkillReviewDTO['skill_ratings'][number],
      'assigned_public_proficiency_code'
    > & {
      assigned_public_proficiency_code?: string | null
    }

    const skillRatings = (data.skill_ratings ?? []) as SkillRatingInput[]
    this.skill_ratings = skillRatings.map((rating) => ({
      ...rating,
      assigned_public_proficiency_code: rating.assigned_public_proficiency_code ?? '',
    }))

    if (this.skill_ratings.length === 0) {
      throw new ValidationException('skill_ratings must contain at least one rating')
    }
    if (this.skill_ratings.length > MAX_SKILL_RATINGS_PER_SUBMISSION) {
      throw new ValidationException(
        `skill_ratings must contain at most ${MAX_SKILL_RATINGS_PER_SUBMISSION} ratings`
      )
    }

    const skillIds = new Set<string>()
    for (const rating of this.skill_ratings) {
      if (typeof rating.skill_id !== 'string' || rating.skill_id.trim().length === 0) {
        throw new ValidationException('skill_id is required for every skill rating')
      }
      const skillId = rating.skill_id.trim().toLowerCase()
      if (!UUID_PATTERN.test(skillId)) {
        throw new ValidationException('skill_id must be a valid UUID')
      }
      if (skillIds.has(skillId)) {
        throw new ValidationException('skill_ratings must not contain duplicate skill_id values')
      }
      skillIds.add(skillId)

      if (!isCanonicalProficiencyLevelCode(rating.assigned_public_proficiency_code)) {
        throw new ValidationException(
          `assigned_public_proficiency_code must be a canonical code (l0-l14): ${rating.assigned_public_proficiency_code}`
        )
      }

      const evidenceIds = new Set<string>()
      for (const evidenceId of rating.evidence_ids ?? []) {
        if (typeof evidenceId !== 'string') {
          throw new ValidationException('evidence_ids must contain valid UUID values')
        }
        const normalizedEvidenceId = evidenceId.trim().toLowerCase()
        if (!UUID_PATTERN.test(normalizedEvidenceId)) {
          throw new ValidationException('evidence_ids must contain valid UUID values')
        }
        if (evidenceIds.has(normalizedEvidenceId)) {
          throw new ValidationException(
            'evidence_ids must not contain duplicate values for one skill rating'
          )
        }
        evidenceIds.add(normalizedEvidenceId)
      }
    }

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
