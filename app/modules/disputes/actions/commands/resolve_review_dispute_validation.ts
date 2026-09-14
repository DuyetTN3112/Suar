import type { ResolveReviewDisputeDTO } from './resolve_review_dispute_command.js'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import type { ReviewDisputeResolutionPersistenceSession } from '#modules/disputes/actions/ports/outbound/review_dispute_resolution_unit_of_work'
import { evaluateReviewDisputeReadiness } from '#modules/disputes/domain/review_dispute_readiness'
import { canResolveReviewDispute } from '#modules/disputes/domain/review_dispute_rules'
import {
  VALID_PROFILE_UPDATE_ACTIONS,
  VALID_REVIEWER_CREDIBILITY_ACTIONS,
} from '#modules/reviews/public_contracts/review_constants'


export function validateTypedActions(dto: ResolveReviewDisputeDTO): void {
  if (dto.profile_update_action && !VALID_PROFILE_UPDATE_ACTIONS.has(dto.profile_update_action)) {
    throw new BusinessLogicException(
      `Invalid profile_update_action: ${dto.profile_update_action}`
    )
  }
  if (
    dto.reviewer_credibility_action &&
    !VALID_REVIEWER_CREDIBILITY_ACTIONS.has(dto.reviewer_credibility_action)
  ) {
    throw new BusinessLogicException(
      `Invalid reviewer_credibility_action: ${dto.reviewer_credibility_action}`
    )
  }
}

export function assertCanResolve(
  actorSystemRole: string,
  disputeStatus: string,
  dto: ResolveReviewDisputeDTO
): void {
  const policyResult = canResolveReviewDispute({
    actorSystemRole,
    disputeStatus,
    finalDecision: dto.final_decision,
    finalRationale: dto.final_rationale,
  })
  if (!policyResult.allowed) {
    if (policyResult.code === 'FORBIDDEN') {
      throw new ForbiddenException(policyResult.reason)
    }
    throw new BusinessLogicException(policyResult.reason)
  }
}

export function assertCanResolveWorkflow(
  actorSystemRole: string,
  workflowStatus: string,
  dto: ResolveReviewDisputeDTO
): void {
  if (actorSystemRole !== 'system_admin' && actorSystemRole !== 'superadmin') {
    throw new ForbiddenException('Only system admin can resolve review disputes')
  }
  if (workflowStatus === 'resolved') {
    throw new BusinessLogicException('Review dispute is already resolved')
  }
  if (
    workflowStatus !== 'reported' &&
    workflowStatus !== 'ai_reviewing' &&
    workflowStatus !== 'admin_reviewing'
  ) {
    throw new BusinessLogicException('Review dispute is not active')
  }
  if (
    ![
      'uphold_review',
      'adjust_score',
      'request_re_review',
      'dismiss_dispute',
      'partially_accept',
    ].includes(dto.final_decision)
  ) {
    throw new BusinessLogicException('Review dispute final decision is invalid')
  }
  if (!dto.final_rationale || dto.final_rationale.trim().length === 0) {
    throw new BusinessLogicException('Review dispute final rationale is required')
  }
}

export function parseJsonValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value ?? null
  }
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export function parseJsonArray(value: unknown): unknown[] {
  const parsed = parseJsonValue(value)
  return Array.isArray(parsed) ? parsed : []
}

export function parseJsonObject(value: unknown): Record<string, unknown> | null {
  const parsed = parseJsonValue(value)
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>
  }
  return null
}

export function assertDossierReady(readiness: ReturnType<typeof evaluateReviewDisputeReadiness>): void {
  if (!readiness.readyForNormalResolution) {
    throw new BusinessLogicException(
      `Review dispute dossier is missing required data: ${readiness.missingRequired.join(', ')}`,
      {
        missing_required: readiness.missingRequired,
        missing_recommended: readiness.missingRecommended,
        warning_recipients: readiness.warningRecipients,
      }
    )
  }
}

export async function enforceDossierReadiness(
  persistence: ReviewDisputeResolutionPersistenceSession,
  dto: ResolveReviewDisputeDTO
): Promise<void> {
  const latestCaseFile = await persistence.loadLatestDossier(dto.dispute_id)
  const readiness = evaluateReviewDisputeReadiness({
    taskSnapshot: parseJsonValue(latestCaseFile?.taskSnapshot),
    assignmentSnapshot: parseJsonValue(latestCaseFile?.assignmentSnapshot),
    submissionSnapshot: parseJsonValue(latestCaseFile?.submissionSnapshot),
    reviewSnapshot: parseJsonValue(latestCaseFile?.reviewSnapshot),
    skillReviewsSnapshot: parseJsonArray(latestCaseFile?.skillReviewsSnapshot),
    disputeClaimSnapshot: parseJsonObject(latestCaseFile?.disputeClaimSnapshot),
    taskCommentsSnapshot: parseJsonArray(latestCaseFile?.taskCommentsSnapshot),
    evidencesSnapshot: parseJsonArray(latestCaseFile?.evidencesSnapshot),
    selfAssessmentSnapshot: parseJsonValue(latestCaseFile?.selfAssessmentSnapshot),
    taskHistorySnapshot: parseJsonArray(latestCaseFile?.taskHistorySnapshot),
    reviewerContextSnapshot: parseJsonValue(latestCaseFile?.reviewerContextSnapshot),
    revieweeProfileContextSnapshot: parseJsonValue(
      latestCaseFile?.revieweeProfileContextSnapshot
    ),
    overrideReadiness: dto.override_readiness ?? false,
    overrideReason: dto.override_reason ?? null,
  })
  assertDossierReady(readiness)
}
