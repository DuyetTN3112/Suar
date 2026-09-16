import type { HttpContext } from '@adonisjs/core/http'

import {
  requireEnumValue,
  toBoolean,
  toNumberOrUndefined,
  toOptionalString,
  toOptionalStringArray,
} from './shared.js'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import type { ResolveFlaggedReviewDTO } from '#modules/moderation/actions/commands/resolve_flagged_review_command'
import {
  AddReviewEvidenceDTO,
  SubmitReverseReviewDTO,
  UpsertTaskSelfAssessmentDTO,
} from '#modules/reviews/actions/dtos/request/review_dtos'
import {
  FlaggedReviewStatus,
  ReverseReviewTargetType,
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

export interface FlaggedReviewsInput {
  page: number
  per_page: number
  after?: string
  before?: string
  status?: string
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

export function buildFlaggedReviewsInput(
  request: HttpContext['request'],
  paginationBuilder: (request: HttpContext['request']) => { page: number; per_page: number }
): FlaggedReviewsInput {
  return omitUndefined({
    ...paginationBuilder(request),
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
