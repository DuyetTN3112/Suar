import { createHash } from 'node:crypto'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type {
  CreateReviewObservationInput,
  ReviewObservationEvidenceLinkInput,
  ReviewObservationRevisionMetadata,
  ReviewRationaleClassification,
} from '#modules/reviews/actions/ports/outbound/observation/review_observation_writer'
import type { ReviewObservationV1 } from '#modules/reviews/public_contracts/observation/completion_review_contracts'
import type {
  TvaPrivacyClassification,
  TvaSha256,
} from '#modules/tasks/public_contracts/task-authoring/primitives'
import { isReviewObservationV1 } from '#modules/tasks/public_contracts/task-authoring/validators'

export const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/

export type EvidenceRelation = 'supports' | 'contradicts' | 'context'
export type ReviewerAccessState = 'available' | 'restricted' | 'unavailable' | 'unknown'

export interface ObservationRowIdentity {
  schema_version: string
  review_workflow_id: string
  review_session_id: string
  task_assignment_id: string
  completion_report_id: string
  completion_claim_id: string | null
  subject_user_id: string
  observation_type: ReviewObservationV1['observationType']
  target_ref: string
}

export class ReviewObservationIdempotencyCollisionException extends InvariantViolationException {
  constructor(idempotencyKey: string) {
    super(`Review observation idempotency key collision: ${idempotencyKey}`)
  }
}

export function canonicalJson(value: unknown): string {
  if (value === undefined) return 'null'
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`

  const record = value as Record<string, unknown>
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(',')}}`
}

export function asSha256(value: string, field: string): asserts value is TvaSha256 {
  if (!SHA256_PATTERN.test(value)) {
    throw new InvariantViolationException(`Review observation ${field} must be a SHA-256 hash`)
  }
}

export function asNonEmpty(value: string, field: string, maxLength: number): void {
  if (value.trim().length === 0 || value.length > maxLength) {
    throw new InvariantViolationException(`Review observation ${field} is invalid`)
  }
}

export function asValidTimestamp(value: string | null, field: string): Date | null {
  if (value === null) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new InvariantViolationException(`Review observation ${field} is invalid`)
  }
  return parsed
}

export function sortedEvidenceLinks(
  links: readonly ReviewObservationEvidenceLinkInput[]
): readonly ReviewObservationEvidenceLinkInput[] {
  return [...links].sort((left, right) => left.evidenceId.localeCompare(right.evidenceId))
}

export function assertEvidenceLinks(
  observation: ReviewObservationV1,
  links: readonly ReviewObservationEvidenceLinkInput[]
): void {
  const allowedRelations = new Set<EvidenceRelation>(['supports', 'contradicts', 'context'])
  const allowedClassifications = new Set<TvaPrivacyClassification>([
    'private',
    'internal',
    'confidential',
    'redacted',
    'public_safe',
    'public',
  ])
  const allowedAccessStates = new Set<ReviewerAccessState>([
    'available',
    'restricted',
    'unavailable',
    'unknown',
  ])
  const linkedIds = links.map((link) => link.evidenceId)

  if (new Set(linkedIds).size !== linkedIds.length) {
    throw new InvariantViolationException('Review observation evidence links must be unique')
  }
  if (
    canonicalJson([...linkedIds].sort()) !== canonicalJson([...observation.evidenceRefs].sort())
  ) {
    throw new InvariantViolationException(
      'Review observation evidence links must exactly match the contract evidence references'
    )
  }

  for (const link of links) {
    if (
      !allowedRelations.has(link.relation) ||
      !allowedClassifications.has(link.accessClassification) ||
      !allowedAccessStates.has(link.reviewerAccessState)
    ) {
      throw new InvariantViolationException('Review observation evidence link metadata is invalid')
    }
    if (link.evidenceHash !== null) asSha256(link.evidenceHash, 'evidence hash')
  }
}

export function assertRevisionInput(
  input: ReviewObservationRevisionMetadata & {
    observation: ReviewObservationV1
    evidenceLinks: readonly ReviewObservationEvidenceLinkInput[]
  }
): void {
  if (!isReviewObservationV1(input.observation)) {
    throw new InvariantViolationException('Review observation contract is invalid')
  }
  asNonEmpty(input.reviewerRole, 'reviewer role', 128)
  asSha256(input.taskAssignmentHash, 'task assignment hash')
  asSha256(input.assignmentSnapshotHash, 'assignment snapshot hash')
  asSha256(input.completionReportHash, 'completion report hash')
  asSha256(input.taskContractHash, 'task contract hash')

  if ((input.completionClaimId === null) !== (input.completionClaimHash === null)) {
    throw new InvariantViolationException(
      'Review observation completion claim ID and hash must be supplied together'
    )
  }
  if (input.completionClaimHash !== null) {
    asSha256(input.completionClaimHash, 'completion claim hash')
  }

  const allowedRationaleClassifications = new Set<ReviewRationaleClassification>([
    'private',
    'internal',
    'confidential',
  ])
  if (!allowedRationaleClassifications.has(input.rationaleClassification)) {
    throw new InvariantViolationException(
      'Review observation rationale cannot be classified for public disclosure'
    )
  }

  const finalizedAt = asValidTimestamp(input.observation.finalizedAt, 'finalized timestamp')
  if (
    (input.observation.governanceState === 'draft' && finalizedAt !== null) ||
    (input.observation.governanceState !== 'draft' && finalizedAt === null)
  ) {
    throw new InvariantViolationException(
      'Review observation finalization must match its governance state'
    )
  }

  const revokedAt = asValidTimestamp(input.revokedAt, 'revocation timestamp')
  const hasCompleteRevocation =
    revokedAt !== null &&
    input.revokedBy !== null &&
    input.revocationReason !== null &&
    input.revocationReason.trim().length > 0
  if (
    (input.observation.governanceState === 'revoked' && !hasCompleteRevocation) ||
    (input.observation.governanceState !== 'revoked' &&
      (input.revokedAt !== null || input.revokedBy !== null || input.revocationReason !== null))
  ) {
    throw new InvariantViolationException(
      'Review observation revocation metadata must match its governance state'
    )
  }

  const disputeFrozenAt = asValidTimestamp(input.disputeFrozenAt, 'dispute freeze timestamp')
  if (
    (input.disputeId === null) !== (disputeFrozenAt === null) ||
    (input.disputeId !== null &&
      !['disputed', 'frozen'].includes(input.observation.governanceState))
  ) {
    throw new InvariantViolationException('Review observation dispute freeze metadata is invalid')
  }

  assertEvidenceLinks(input.observation, input.evidenceLinks)
}

export function revisionHash(
  input: ReviewObservationRevisionMetadata & {
    observation: ReviewObservationV1
    evidenceLinks: readonly ReviewObservationEvidenceLinkInput[]
  }
): TvaSha256 {
  const value = canonicalJson({
    observation: input.observation,
    reviewerRole: input.reviewerRole,
    taskAssignmentHash: input.taskAssignmentHash,
    assignmentSnapshotHash: input.assignmentSnapshotHash,
    completionReportId: input.completionReportId,
    completionReportHash: input.completionReportHash,
    completionClaimId: input.completionClaimId,
    completionClaimHash: input.completionClaimHash,
    sourceSnapshotId: input.sourceSnapshotId,
    taskContractVersionId: input.taskContractVersionId,
    taskContractHash: input.taskContractHash,
    rationaleClassification: input.rationaleClassification,
    evidenceSufficiency: input.evidenceSufficiency,
    revokedAt: input.revokedAt,
    revokedBy: input.revokedBy,
    revocationReason: input.revocationReason,
    disputeId: input.disputeId,
    disputeFrozenAt: input.disputeFrozenAt,
    revisionPayload: input.revisionPayload ?? input.observation,
    evidenceLinks: sortedEvidenceLinks(input.evidenceLinks),
  })
  return `sha256:${createHash('sha256').update(value).digest('hex')}`
}

export function assertStableIdentity(
  observation: ObservationRowIdentity,
  next: CreateReviewObservationInput
): void {
  const fact = next.observation
  if (
    observation.schema_version !== fact.schemaVersion ||
    observation.review_workflow_id !== fact.reviewWorkflowId ||
    observation.review_session_id !== fact.reviewSessionId ||
    observation.task_assignment_id !== fact.taskAssignmentId ||
    observation.completion_report_id !== next.completionReportId ||
    observation.completion_claim_id !== next.completionClaimId ||
    observation.subject_user_id !== fact.subjectUserId ||
    observation.observation_type !== fact.observationType ||
    observation.target_ref !== fact.targetRef
  ) {
    throw new InvariantViolationException(
      'Review observation correction cannot change the stable observation identity'
    )
  }
}
