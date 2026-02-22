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

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'
import type { CreateReviewDisputeDTO } from '#modules/reviews/actions/commands/create_review_dispute_command'
import type { CreateReviewDisputeCommentDTO } from '#modules/reviews/actions/commands/create_review_dispute_comment_command'
import type { ReportReviewDisputeDTO } from '#modules/reviews/actions/commands/report_review_dispute_command'
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
  after?: string
  before?: string
}

interface FlaggedReviewsInput {
  page: number
  per_page: number
  after?: string
  before?: string
  status?: string
}

function readAliasedInput(
  request: HttpContext['request'],
  camelKey: string,
  snakeKey: string,
  fallback?: unknown
): unknown {
  return request.input(camelKey, request.input(snakeKey, fallback))
}

function buildPaginationInput(request: HttpContext['request']) {
  const pagination = normalizePagination(
    {
      page: request.input('page', PAGINATION.DEFAULT_PAGE),
      perPage: readAliasedInput(request, 'perPage', 'per_page', PAGINATION.DEFAULT_PER_PAGE),
    },
    PAGINATION
  )

  return {
    page: pagination.page,
    per_page: pagination.perPage,
  }
}

function readAliasedRatingValue(rating: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    const value = rating[key]
    if (value !== undefined && value !== null) {
      return value
    }
  }
  return undefined
}

export function buildCreateReviewSessionDTO(
  request: HttpContext['request']
): CreateReviewSessionDTO {
  return new CreateReviewSessionDTO({
    task_assignment_id: (request.input('taskAssignmentId') ??
      request.input('task_assignment_id')) as string,
    reviewee_id: (request.input('revieweeId') ?? request.input('reviewee_id')) as string,
    required_peer_reviews: toPositiveNumber(
      request.input('requiredPeerReviews') ?? request.input('required_peer_reviews', 2),
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
  return omitUndefined({
    ...buildPaginationInput(request),
    after: toOptionalString(request.input('after') as unknown),
    before: toOptionalString(request.input('before') as unknown),
  })
}

export function buildGetReviewSessionDTO(reviewSessionId: string): GetReviewSessionDTO {
  return new GetReviewSessionDTO(reviewSessionId)
}

export function buildSubmitSkillReviewDTO(
  request: HttpContext['request'],
  reviewSessionId: string
): SubmitSkillReviewDTO {
  const reviewerType = requireEnumValue(
    request.input('reviewerType') ?? request.input('reviewer_type'),
    Object.values(ReviewerType) as ReviewerType[],
    ErrorMessages.INVALID_INPUT
  )

  const rawSkillRatings: unknown = request.input('skillRatings') ?? request.input('skill_ratings')
  if (!Array.isArray(rawSkillRatings)) {
    throwInvalidInput()
  }

  const skillRatings = rawSkillRatings.map((rating: unknown) => {
    if (!rating || typeof rating !== 'object' || Array.isArray(rating)) {
      throwInvalidInput()
    }

    const record = rating as Record<string, unknown>
    const skillId = readAliasedRatingValue(record, 'skillId', 'skill_id')
    const levelCode = readAliasedRatingValue(
      record,
      'assignedPublicProficiencyCode',
      'assigned_public_proficiency_code',
      'levelCode'
    )
    const confidence = record['confidence']

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
      confidence === 'low' || confidence === 'medium' || confidence === 'high' ? confidence : null

    return omitUndefined({
      skill_id: skillId,
      assigned_public_proficiency_code: levelCode,
      comment: toOptionalString(record['comment']),
      insufficient_evidence: toBoolean(
        readAliasedRatingValue(record, 'insufficientEvidence', 'insufficient_evidence') ?? false
      ),
      observed_level_id: toOptionalString(
        readAliasedRatingValue(record, 'observedLevelId', 'observed_level_id')
      ),
      rubric_version_id: toOptionalString(
        readAliasedRatingValue(record, 'rubricVersionId', 'rubric_version_id')
      ),
      confidence: normalizedConfidence,
      rationale: toOptionalString(record['rationale']),
      observable_behaviors: Array.isArray(
        readAliasedRatingValue(record, 'observableBehaviors', 'observable_behaviors')
      )
        ? (
            readAliasedRatingValue(
              record,
              'observableBehaviors',
              'observable_behaviors'
            ) as unknown[]
          ).filter((item): item is string => typeof item === 'string')
        : [],
      evidence_ids: Array.isArray(readAliasedRatingValue(record, 'evidenceIds', 'evidence_ids'))
        ? (readAliasedRatingValue(record, 'evidenceIds', 'evidence_ids') as unknown[]).filter(
            (item): item is string => typeof item === 'string'
          )
        : [],
    })
  })

  return SubmitSkillReviewDTO.forReviewer(
    reviewerType,
    omitUndefined({
      review_session_id: reviewSessionId,
      skill_ratings: skillRatings,
      quality_metrics: {
        overall_quality_score:
          toNumberOrUndefined(
            request.input('overallQualityScore') ?? request.input('overall_quality_score')
          ) ?? null,
        delivery_timeliness:
          toOptionalString(
            request.input('deliveryTimeliness') ?? request.input('delivery_timeliness')
          ) ?? null,
        requirement_adherence:
          toNumberOrUndefined(
            request.input('requirementAdherence') ?? request.input('requirement_adherence')
          ) ?? null,
        communication_quality:
          toNumberOrUndefined(
            request.input('communicationQuality') ?? request.input('communication_quality')
          ) ?? null,
        code_quality_score:
          toNumberOrUndefined(
            request.input('codeQualityScore') ?? request.input('code_quality_score')
          ) ?? null,
        proactiveness_score:
          toNumberOrUndefined(
            request.input('proactivenessScore') ?? request.input('proactiveness_score')
          ) ?? null,
        would_work_with_again:
          request.input('wouldWorkWithAgain') === undefined &&
          request.input('would_work_with_again') === undefined
            ? null
            : toBoolean(
                request.input('wouldWorkWithAgain') ?? request.input('would_work_with_again')
              ),
      },
      strengths_observed: toOptionalString(
        request.input('strengthsObserved') ?? request.input('strengths_observed')
      ),
      areas_for_improvement: toOptionalString(
        request.input('areasForImprovement') ?? request.input('areas_for_improvement')
      ),
    })
  )
}

export function buildConfirmReviewDTO(
  request: HttpContext['request'],
  reviewSessionId: string
): ConfirmReviewDTO {
  return new ConfirmReviewDTO(
    omitUndefined({
      review_session_id: reviewSessionId,
      action: requireEnumValue(
        request.input('action'),
        ['confirmed', 'disputed'] as const,
        ErrorMessages.INVALID_INPUT
      ),
      dispute_reason: toOptionalString(
        (request.input('disputeReason') as unknown) ?? (request.input('dispute_reason') as unknown)
      ),
    })
  )
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
  const disputedDimensions =
    (request.input('disputedDimensions') as unknown) ??
    (request.input('disputed_dimensions') as unknown)
  const disputedSkillReviews =
    (request.input('disputedSkillReviews') as unknown) ??
    (request.input('disputed_skill_reviews') as unknown)

  return {
    review_session_id: String(
      (request.input('reviewSessionId') as unknown) ?? request.input('review_session_id') ?? ''
    ),
    dispute_reason: String(
      (request.input('disputeReason') as unknown) ?? request.input('dispute_reason') ?? ''
    ),
    disputed_dimensions:
      disputedDimensions &&
      typeof disputedDimensions === 'object' &&
      !Array.isArray(disputedDimensions)
        ? (disputedDimensions as Record<string, unknown>)
        : null,
    disputed_skill_reviews: Array.isArray(disputedSkillReviews)
      ? (disputedSkillReviews as Record<string, unknown>[])
      : null,
    requested_outcome: requireEnumValue(
      (request.input('requestedOutcome') as unknown) ?? request.input('requested_outcome'),
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

export function buildReportReviewDisputeDTO(
  request: HttpContext['request'],
  disputeId: string
): ReportReviewDisputeDTO {
  return {
    dispute_id: disputeId,
    escalation_reason: String(
      (request.input('escalationReason') as unknown) ?? request.input('escalation_reason') ?? ''
    ),
  }
}

export function buildResolveReviewDisputeDTO(
  request: HttpContext['request'],
  disputeId: string
): ResolveReviewDisputeDTO {
  return omitUndefined({
    dispute_id: disputeId,
    final_decision: requireEnumValue(
      (request.input('finalDecision') as unknown) ?? request.input('final_decision'),
      [
        'uphold_review',
        'adjust_score',
        'request_re_review',
        'dismiss_dispute',
        'partially_accept',
      ] as const,
      ErrorMessages.INVALID_INPUT
    ),
    final_rationale: String(
      (request.input('finalRationale') as unknown) ?? request.input('final_rationale') ?? ''
    ),
    profile_update_action: toOptionalString(
      (request.input('profileUpdateAction') as unknown) ??
        (request.input('profile_update_action') as unknown)
    ),
    reviewer_credibility_action: toOptionalString(
      (request.input('reviewerCredibilityAction') as unknown) ??
        (request.input('reviewer_credibility_action') as unknown)
    ),
    source_type: (request.input('sourceType') ?? request.input('source_type')) as
      | ResolveReviewDisputeDTO['source_type']
      | undefined,
    override_readiness: toBoolean(
      (request.input('overrideReadiness') as unknown) ??
        (request.input('override_readiness') as unknown) ??
        false
    ),
    override_reason: toOptionalString(
      (request.input('overrideReason') as unknown) ?? (request.input('override_reason') as unknown)
    ),
  })
}

export function buildStartAiDisputeEvaluationDTO(
  request: HttpContext['request'],
  disputeId: string
): StartAiDisputeEvaluationDTO {
  return omitUndefined({
    dispute_id: disputeId,
    provider: String(request.input('provider') ?? 'ai_council'),
    source_type: (request.input('sourceType') ?? request.input('source_type')) as
      | StartAiDisputeEvaluationDTO['source_type']
      | undefined,
  })
}

export function buildAddReviewEvidenceDTO(
  request: HttpContext['request'],
  reviewSessionId: string
): AddReviewEvidenceDTO {
  return new AddReviewEvidenceDTO(
    omitUndefined({
      review_session_id: reviewSessionId,
      evidence_type: ((request.input('evidenceType') as unknown) ??
        (request.input('evidence_type') as unknown)) as string,
      url: toOptionalString(request.input('url') as unknown),
      title: toOptionalString(request.input('title') as unknown),
      description: toOptionalString(request.input('description') as unknown),
    })
  )
}

export function buildSubmitReverseReviewDTO(
  request: HttpContext['request'],
  reviewSessionId: string
): SubmitReverseReviewDTO {
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
