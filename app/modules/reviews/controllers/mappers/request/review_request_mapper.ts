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

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import type { CreateReviewDisputeDTO } from '#modules/reviews/actions/commands/create_review_dispute_command'
import type { CreateReviewDisputeCommentDTO } from '#modules/reviews/actions/commands/create_review_dispute_comment_command'
import type { ResolveFlaggedReviewDTO } from '#modules/reviews/actions/commands/resolve_flagged_review_command'
import type { ResolveReviewDisputeDTO } from '#modules/reviews/actions/commands/resolve_review_dispute_command'
import type { RespondToReviewDisputeDTO } from '#modules/reviews/actions/commands/respond_to_review_dispute_command'
import type { StartAiDisputeEvaluationDTO } from '#modules/reviews/actions/commands/start_ai_dispute_evaluation_command'
import {
  AddReviewEvidenceDTO,
  ConfirmReviewDTO,
  CreateReviewSessionDTO,
  GetReviewSessionDTO,
  GetUserReviewsDTO,
  SubmitReverseReviewDTO,
  SubmitSkillReviewDTO,
  UpsertTaskSelfAssessmentDTO,
} from '#modules/reviews/actions/dtos/request/review_dtos'
import {
  FlaggedReviewStatus,
  ReverseReviewTargetType,
  ReviewerType,
} from '#modules/reviews/constants/review_constants'

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
    const confidence = record.confidence

    if (typeof skillId !== 'string' || typeof levelCode !== 'string') {
      throwInvalidInput()
    }

    if (
      confidence !== undefined &&
      confidence !== null &&
      confidence !== 'low' &&
      confidence !== 'medium' &&
      confidence !== 'high'
    ) {
      throwInvalidInput()
    }
    const normalizedConfidence: 'low' | 'medium' | 'high' | null =
      confidence === 'low' || confidence === 'medium' || confidence === 'high'
        ? confidence
        : null

    return {
      skill_id: skillId,
      assigned_level_code: levelCode,
      comment: toOptionalString(record.comment),
      insufficient_evidence: toBoolean(record.insufficient_evidence ?? false),
      observed_level_id: toOptionalString(record.observed_level_id),
      rubric_version_id: toOptionalString(record.rubric_version_id),
      confidence: normalizedConfidence,
      rationale: toOptionalString(record.rationale),
      observable_behaviors: Array.isArray(record.observable_behaviors)
        ? record.observable_behaviors.filter((item): item is string => typeof item === 'string')
        : [],
      evidence_ids: Array.isArray(record.evidence_ids)
        ? record.evidence_ids.filter((item): item is string => typeof item === 'string')
        : [],
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

export function buildCreateReviewDisputeCommentDTO(
  request: HttpContext['request'],
  disputeId: string
): CreateReviewDisputeCommentDTO {
  return {
    dispute_id: disputeId,
    body: String(request.input('body') ?? ''),
    visibility: requireEnumValue(
      request.input('visibility', 'all_parties'),
      ['all_parties', 'admin_only'] as const,
      ErrorMessages.INVALID_INPUT
    ),
  }
}

export function buildCreateReviewDisputeDTO(
  request: HttpContext['request']
): CreateReviewDisputeDTO {
  const disputedDimensions = request.input('disputed_dimensions') as unknown
  const disputedSkillReviews = request.input('disputed_skill_reviews') as unknown

  return {
    review_session_id: String(request.input('review_session_id') ?? ''),
    dispute_reason: String(request.input('dispute_reason') ?? ''),
    disputed_dimensions:
      disputedDimensions && typeof disputedDimensions === 'object' && !Array.isArray(disputedDimensions)
        ? (disputedDimensions as Record<string, unknown>)
        : null,
    disputed_skill_reviews: Array.isArray(disputedSkillReviews)
      ? (disputedSkillReviews as Record<string, unknown>[])
      : null,
    requested_outcome: requireEnumValue(
      request.input('requested_outcome'),
      ['adjust_score', 'remove_review', 'request_re_review', 'add_context', 'other'] as const,
      ErrorMessages.INVALID_INPUT
    ),
  }
}

export function buildRespondToReviewDisputeDTO(
  request: HttpContext['request'],
  disputeId: string
): RespondToReviewDisputeDTO {
  return {
    dispute_id: disputeId,
    body: String(request.input('body') ?? ''),
    visibility: requireEnumValue(
      request.input('visibility', 'all_parties'),
      ['all_parties', 'admin_only'] as const,
      ErrorMessages.INVALID_INPUT
    ),
  }
}

export function buildResolveReviewDisputeDTO(
  request: HttpContext['request'],
  disputeId: string
): ResolveReviewDisputeDTO {
  return {
    dispute_id: disputeId,
    final_decision: requireEnumValue(
      request.input('final_decision'),
      [
        'uphold_review',
        'adjust_score',
        'request_re_review',
        'dismiss_dispute',
        'partially_accept',
      ] as const,
      ErrorMessages.INVALID_INPUT
    ),
    final_rationale: String(request.input('final_rationale') ?? ''),
    profile_update_action: toOptionalString(request.input('profile_update_action') as unknown),
    reviewer_credibility_action: toOptionalString(
      request.input('reviewer_credibility_action') as unknown
    ),
  }
}

export function buildStartAiDisputeEvaluationDTO(
  request: HttpContext['request'],
  disputeId: string
): StartAiDisputeEvaluationDTO {
  return {
    dispute_id: disputeId,
    provider: String(request.input('provider') ?? 'ai_council'),
  }
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
