import type { HttpContext } from '@adonisjs/core/http'

import {
  PAGINATION,
  requireEnumValue,
  throwInvalidInput,
  toBoolean,
  toNumberOrUndefined,
  toOptionalString,
  toOptionalStringArray,
  toPositiveNumber,
} from './shared.js'

import type { ResolveFlaggedReviewDTO } from '#actions/reviews/commands/resolve_flagged_review_command'
import {
  AddReviewEvidenceDTO,
  ConfirmReviewDTO,
  CreateReviewSessionDTO,
  GetReviewSessionDTO,
  GetUserReviewsDTO,
  SubmitReverseReviewDTO,
  SubmitSkillReviewDTO,
  UpsertTaskSelfAssessmentDTO,
} from '#actions/reviews/dtos/request/review_dtos'
import { ErrorMessages } from '#constants/error_constants'
import {
  FlaggedReviewStatus,
  ReverseReviewTargetType,
  ReviewerType,
} from '#constants/review_constants'


interface PendingReviewsInput {
  page: number
  per_page: number
}

interface FlaggedReviewsInput {
  page: number
  per_page: number
  status?: string
}

function buildPaginationInput(request: HttpContext['request']) {
  return {
    page: toPositiveNumber(
      request.input('page', PAGINATION.DEFAULT_PAGE) as unknown,
      PAGINATION.DEFAULT_PAGE
    ),
    per_page: toPositiveNumber(
      request.input('per_page', PAGINATION.DEFAULT_PER_PAGE) as unknown,
      PAGINATION.DEFAULT_PER_PAGE
    ),
  }
}

export function buildCreateReviewSessionDTO(
  request: HttpContext['request']
): CreateReviewSessionDTO {
  return new CreateReviewSessionDTO({
    task_assignment_id: request.input('task_assignment_id') as string,
    reviewee_id: request.input('reviewee_id') as string,
    required_peer_reviews: toPositiveNumber(
      request.input('required_peer_reviews', 2) as unknown,
      2
    ),
  })
}

export function buildGetUserReviewsDTO(
  request: HttpContext['request'],
  userId: string
): GetUserReviewsDTO {
  return new GetUserReviewsDTO({
    user_id: userId,
    ...buildPaginationInput(request),
  })
}

export function buildPendingReviewsInput(request: HttpContext['request']): PendingReviewsInput {
  return buildPaginationInput(request)
}

export function buildGetReviewSessionDTO(reviewSessionId: string): GetReviewSessionDTO {
  return new GetReviewSessionDTO(reviewSessionId)
}

export function buildSubmitSkillReviewDTO(
  request: HttpContext['request'],
  reviewSessionId: string
): SubmitSkillReviewDTO {
  const reviewerType = requireEnumValue(
    request.input('reviewer_type'),
    Object.values(ReviewerType) as ReviewerType[],
    ErrorMessages.INVALID_INPUT
  )

  const rawSkillRatings = request.input('skill_ratings') as unknown
  if (!Array.isArray(rawSkillRatings)) {
    throwInvalidInput()
  }

  const skillRatings = rawSkillRatings.map((rating) => {
    if (!rating || typeof rating !== 'object' || Array.isArray(rating)) {
      throwInvalidInput()
    }

    const record = rating as Record<string, unknown>
    const skillId = record.skill_id
    const levelCode = record.level_code

    if (typeof skillId !== 'string' || typeof levelCode !== 'string') {
      throwInvalidInput()
    }

    return {
      skill_id: skillId,
      assigned_level_code: levelCode,
      comment: toOptionalString(record.comment),
    }
  })

  return SubmitSkillReviewDTO.forReviewer(reviewerType, {
    review_session_id: reviewSessionId,
    skill_ratings: skillRatings,
    quality_metrics: {
      overall_quality_score:
        toNumberOrUndefined(request.input('overall_quality_score') as unknown) ?? null,
      delivery_timeliness:
        toOptionalString(request.input('delivery_timeliness') as unknown) ?? null,
      requirement_adherence:
        toNumberOrUndefined(request.input('requirement_adherence') as unknown) ?? null,
      communication_quality:
        toNumberOrUndefined(request.input('communication_quality') as unknown) ?? null,
      code_quality_score:
        toNumberOrUndefined(request.input('code_quality_score') as unknown) ?? null,
      proactiveness_score:
        toNumberOrUndefined(request.input('proactiveness_score') as unknown) ?? null,
      would_work_with_again:
        request.input('would_work_with_again') === undefined
          ? null
          : toBoolean(request.input('would_work_with_again')),
    },
    strengths_observed: toOptionalString(request.input('strengths_observed') as unknown),
    areas_for_improvement: toOptionalString(request.input('areas_for_improvement') as unknown),
  })
}

export function buildConfirmReviewDTO(
  request: HttpContext['request'],
  reviewSessionId: string
): ConfirmReviewDTO {
  return new ConfirmReviewDTO({
    review_session_id: reviewSessionId,
    action: requireEnumValue(
      request.input('action'),
      ['confirmed', 'disputed'] as const,
      ErrorMessages.INVALID_INPUT
    ),
    dispute_reason: toOptionalString(request.input('dispute_reason') as unknown),
  })
}

export function buildAddReviewEvidenceDTO(
  request: HttpContext['request'],
  reviewSessionId: string
): AddReviewEvidenceDTO {
  return new AddReviewEvidenceDTO({
    review_session_id: reviewSessionId,
    evidence_type: request.input('evidence_type') as string,
    url: toOptionalString(request.input('url') as unknown),
    title: toOptionalString(request.input('title') as unknown),
    description: toOptionalString(request.input('description') as unknown),
  })
}

export function buildSubmitReverseReviewDTO(
  request: HttpContext['request'],
  reviewSessionId: string
): SubmitReverseReviewDTO {
  return new SubmitReverseReviewDTO({
    review_session_id: reviewSessionId,
    target_type: requireEnumValue(
      request.input('target_type'),
      Object.values(ReverseReviewTargetType) as ReverseReviewTargetType[],
      `target_type must be one of: ${Object.values(ReverseReviewTargetType).join(', ')}`
    ),
    target_id: request.input('target_id') as string,
    rating: Number(request.input('rating')),
    comment: toOptionalString(request.input('comment') as unknown),
    is_anonymous: toBoolean(request.input('is_anonymous', false) as unknown),
  })
}

export function buildUpsertTaskSelfAssessmentDTO(
  request: HttpContext['request'],
  reviewSessionId: string
): UpsertTaskSelfAssessmentDTO {
  return new UpsertTaskSelfAssessmentDTO({
    review_session_id: reviewSessionId,
    overall_satisfaction: toNumberOrUndefined(request.input('overall_satisfaction') as unknown),
    difficulty_felt: toOptionalString(request.input('difficulty_felt') as unknown),
    confidence_level: toNumberOrUndefined(request.input('confidence_level') as unknown),
    what_went_well: toOptionalString(request.input('what_went_well') as unknown),
    what_would_do_different: toOptionalString(request.input('what_would_do_different') as unknown),
    blockers_encountered: toOptionalStringArray(request.input('blockers_encountered') as unknown),
    skills_felt_lacking: toOptionalStringArray(request.input('skills_felt_lacking') as unknown),
    skills_felt_strong: toOptionalStringArray(request.input('skills_felt_strong') as unknown),
  })
}

export function buildFlaggedReviewsInput(request: HttpContext['request']): FlaggedReviewsInput {
  return {
    ...buildPaginationInput(request),
    status: toOptionalString(request.input('status') as unknown),
  }
}

export function buildResolveFlaggedReviewDTO(
  request: HttpContext['request'],
  flaggedReviewId: string
): ResolveFlaggedReviewDTO {
  return {
    flagged_review_id: flaggedReviewId,
    action: requireEnumValue(
      request.input('action'),
      [FlaggedReviewStatus.DISMISSED, FlaggedReviewStatus.CONFIRMED] as const,
      ErrorMessages.INVALID_INPUT
    ),
    notes: toOptionalString(request.input('notes') as unknown) ?? null,
  }
}
