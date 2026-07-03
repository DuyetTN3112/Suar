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
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'
import type { CreateReviewDisputeDTO } from '#modules/reviews/actions/commands/disputes/create_review_dispute_command'
import type { CreateReviewDisputeCommentDTO } from '#modules/reviews/actions/commands/disputes/create_review_dispute_comment_command'
import type { ReportReviewDisputeDTO } from '#modules/reviews/actions/commands/disputes/report_review_dispute_command'
import type { ResolveFlaggedReviewDTO } from '#modules/reviews/actions/commands/moderation/resolve_flagged_review_command'
import type { ResolveReviewDisputeDTO } from '#modules/reviews/actions/commands/disputes/resolve_review_dispute_command'
import type { RespondToReviewDisputeDTO } from '#modules/reviews/actions/commands/disputes/respond_to_review_dispute_command'
import type { StartAiDisputeEvaluationDTO } from '#modules/reviews/actions/commands/disputes/start_ai_dispute_evaluation_command'
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
} from '#modules/reviews/public_contracts/review_constants'

type OptionalPayloadKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

type OmittedUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalPayloadKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalPayloadKeys<T>]?: Exclude<T[Key], undefined>
}

function omitUndefined<T extends object>(value: T): OmittedUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmittedUndefined<T>
}


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

function readOptionalStrictStringArray(value: unknown): string[] {
  if (value === undefined || value === null) {
    return []
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throwInvalidInput()
  }
  return value as string[]
}

function readStrictOptionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > 8000) {
    throw ValidationException.field(field, `${field} must be a non-empty string no longer than 8000 characters`)
  }
  return value.trim()
}

function readStrictBoolean(value: unknown, field: string, fallback: boolean | null): boolean | null {
  if (value === undefined || value === null) return fallback
  if (typeof value !== 'boolean') {
    throw ValidationException.field(field, `${field} must be a boolean`)
  }
  return value
}

function readStrictScore(value: unknown, field: string): number | null {
  if (value === undefined || value === null || value === '') return null
  const score = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw ValidationException.field(field, `${field} must be a number between 0 and 100`)
  }
  return score
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
    const observableBehaviors = readOptionalStrictStringArray(
      readAliasedRatingValue(record, 'observableBehaviors', 'observable_behaviors')
    )
    const evidenceIds = readOptionalStrictStringArray(
      readAliasedRatingValue(record, 'evidenceIds', 'evidence_ids')
    )

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
      comment: readStrictOptionalString(record['comment'], 'skillRatings.comment'),
      insufficient_evidence: readStrictBoolean(
        readAliasedRatingValue(record, 'insufficientEvidence', 'insufficient_evidence'),
        'skillRatings.insufficientEvidence',
        false
      ) ?? false,
      observed_level_id: readStrictOptionalString(
        readAliasedRatingValue(record, 'observedLevelId', 'observed_level_id'),
        'skillRatings.observedLevelId'
      ),
      rubric_version_id: readStrictOptionalString(
        readAliasedRatingValue(record, 'rubricVersionId', 'rubric_version_id'),
        'skillRatings.rubricVersionId'
      ),
      confidence: normalizedConfidence,
      rationale: readStrictOptionalString(record['rationale'], 'skillRatings.rationale'),
      observable_behaviors: observableBehaviors,
      evidence_ids: evidenceIds,
    })
  })

  return SubmitSkillReviewDTO.forReviewer(
    reviewerType,
    omitUndefined({
      review_session_id: reviewSessionId,
      skill_ratings: skillRatings,
      quality_metrics: {
        overall_quality_score: readStrictScore(
          request.input('overallQualityScore') ?? request.input('overall_quality_score'),
          'overallQualityScore'
        ),
        delivery_timeliness: readStrictOptionalString(
          request.input('deliveryTimeliness') ?? request.input('delivery_timeliness'),
          'deliveryTimeliness'
        ) ?? null,
        requirement_adherence: readStrictScore(
          request.input('requirementAdherence') ?? request.input('requirement_adherence'),
          'requirementAdherence'
        ),
        communication_quality: readStrictScore(
          request.input('communicationQuality') ?? request.input('communication_quality'),
          'communicationQuality'
        ),
        code_quality_score: readStrictScore(
          request.input('codeQualityScore') ?? request.input('code_quality_score'),
          'codeQualityScore'
        ),
        proactiveness_score: readStrictScore(
          request.input('proactivenessScore') ?? request.input('proactiveness_score'),
          'proactivenessScore'
        ),
        would_work_with_again: readStrictBoolean(
          request.input('wouldWorkWithAgain') ?? request.input('would_work_with_again'),
          'wouldWorkWithAgain',
          null
        ),
      },
      strengths_observed: readStrictOptionalString(
        request.input('strengthsObserved') ?? request.input('strengths_observed'),
        'strengthsObserved'
      ),
      areas_for_improvement: readStrictOptionalString(
        request.input('areasForImprovement') ?? request.input('areas_for_improvement'),
        'areasForImprovement'
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
  return new SubmitReverseReviewDTO(
    omitUndefined({
      review_session_id: reviewSessionId,
      target_type: requireEnumValue(
        (request.input('targetType') as unknown) ?? request.input('target_type'),
        Object.values(ReverseReviewTargetType) as ReverseReviewTargetType[],
        `target_type must be one of: ${Object.values(ReverseReviewTargetType).join(', ')}`
      ),
      target_id: ((request.input('targetId') as unknown) ??
        (request.input('target_id') as unknown)) as string,
      rating: Number(request.input('rating')),
      comment: toOptionalString(request.input('comment') as unknown),
      is_anonymous: toBoolean(request.input('isAnonymous') ?? request.input('is_anonymous', false)),
    })
  )
}

export function buildUpsertTaskSelfAssessmentDTO(
  request: HttpContext['request'],
  reviewSessionId: string
): UpsertTaskSelfAssessmentDTO {
  return new UpsertTaskSelfAssessmentDTO(
    omitUndefined({
      review_session_id: reviewSessionId,
      overall_satisfaction: toNumberOrUndefined(
        (request.input('overallSatisfaction') as unknown) ??
          (request.input('overall_satisfaction') as unknown)
      ),
      difficulty_felt: toOptionalString(
        (request.input('difficultyFelt') as unknown) ??
          (request.input('difficulty_felt') as unknown)
      ),
      confidence_level: toNumberOrUndefined(
        (request.input('confidenceLevel') as unknown) ??
          (request.input('confidence_level') as unknown)
      ),
      what_went_well: toOptionalString(
        (request.input('whatWentWell') as unknown) ?? (request.input('what_went_well') as unknown)
      ),
      what_would_do_different: toOptionalString(
        (request.input('whatWouldDoDifferent') as unknown) ??
          (request.input('what_would_do_different') as unknown)
      ),
      blockers_encountered: toOptionalStringArray(
        (request.input('blockersEncountered') as unknown) ??
          (request.input('blockers_encountered') as unknown)
      ),
      skills_felt_lacking: toOptionalStringArray(
        (request.input('skillsFeltLacking') as unknown) ??
          (request.input('skills_felt_lacking') as unknown)
      ),
      skills_felt_strong: toOptionalStringArray(
        (request.input('skillsFeltStrong') as unknown) ??
          (request.input('skills_felt_strong') as unknown)
      ),
    })
  )
}

export function buildFlaggedReviewsInput(request: HttpContext['request']): FlaggedReviewsInput {
  return omitUndefined({
    ...buildPaginationInput(request),
    after: toOptionalString(request.input('after') as unknown),
    before: toOptionalString(request.input('before') as unknown),
    status: toOptionalString(request.input('status') as unknown),
  })
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
