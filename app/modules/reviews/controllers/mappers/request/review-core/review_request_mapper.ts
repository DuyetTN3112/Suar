import type { HttpContext } from '@adonisjs/core/http'

import {
  buildFlaggedReviewsInput as buildFlaggedReviewsInputWithPagination,
  type FlaggedReviewsInput,
} from './review_supplementary_request_mapper.js'
import {
  PAGINATION,
  requireEnumValue,
  throwInvalidInput,
  toOptionalString,
  toPositiveNumber,
} from './shared.js'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'
import {
  ConfirmReviewDTO,
  CreateReviewSessionDTO,
  GetReviewSessionDTO,
  GetUserReviewsDTO,
  SubmitSkillReviewDTO,
} from '#modules/reviews/actions/dtos/request/review_dtos'
import { ReviewerType } from '#modules/reviews/public_contracts/review_constants'


export {
  buildAddReviewEvidenceDTO,
  buildResolveFlaggedReviewDTO,
  buildSubmitReverseReviewDTO,
  buildUpsertTaskSelfAssessmentDTO,
  type FlaggedReviewsInput,
} from './review_supplementary_request_mapper.js'

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

export interface PendingReviewsInput {
  page: number
  per_page: number
  after?: string
  before?: string
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

export function buildFlaggedReviewsInput(request: HttpContext['request']): FlaggedReviewsInput {
  return buildFlaggedReviewsInputWithPagination(request, buildPaginationInput)
}
