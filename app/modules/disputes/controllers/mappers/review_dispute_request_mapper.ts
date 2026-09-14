import type { HttpContext } from '@adonisjs/core/http'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import type { CreateReviewDisputeDTO } from '#modules/disputes/actions/commands/create_review_dispute_command'
import type { CreateReviewDisputeCommentDTO } from '#modules/disputes/actions/commands/create_review_dispute_comment_command'
import type { ReportReviewDisputeDTO } from '#modules/disputes/actions/commands/report_review_dispute_command'
import type { ResolveReviewDisputeDTO } from '#modules/disputes/actions/commands/resolve_review_dispute_command'
import type { RespondToReviewDisputeDTO } from '#modules/disputes/actions/commands/respond_to_review_dispute_command'
import type { StartAiDisputeEvaluationDTO } from '#modules/disputes/actions/commands/start_ai_dispute_evaluation_command'

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

function toOptionalString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value).trim()
  }
  return undefined
}

function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return normalized === 'true' || normalized === '1'
  }
  return Boolean(value)
}

function requireEnumValue<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  message = ErrorMessages.INVALID_INPUT
): T {
  if (typeof value === 'string' && (allowedValues as readonly string[]).includes(value)) {
    return value as T
  }
  throw new ValidationException(message)
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
