import type { ReviewObservationV1 } from '#modules/reviews/public_contracts/observation/completion_review_contracts'
import type { ReviewEvidenceSufficiencyV1 } from '#modules/reviews/public_contracts/observation/review_governance_primitives'
import type { TvaSha256 } from '#modules/tasks/public_contracts/task-authoring/primitives'

export const REVIEW_FINALIZATION_READINESS_CODES = Object.freeze({
  policyUnresolved: 'TVA.REVIEW.FINALIZATION.POLICY_UNRESOLVED',
  observationRequired: 'TVA.REVIEW.FINALIZATION.OBSERVATION_REQUIRED',
  staleRevision: 'TVA.REVIEW.FINALIZATION.STALE_REVISION',
  workflowMismatch: 'TVA.REVIEW.FINALIZATION.WORKFLOW_MISMATCH',
  sessionMismatch: 'TVA.REVIEW.FINALIZATION.SESSION_MISMATCH',
  assignmentMismatch: 'TVA.REVIEW.FINALIZATION.ASSIGNMENT_MISMATCH',
  snapshotMismatch: 'TVA.REVIEW.FINALIZATION.SNAPSHOT_MISMATCH',
  reportMismatch: 'TVA.REVIEW.FINALIZATION.REPORT_MISMATCH',
  reportHashMismatch: 'TVA.REVIEW.FINALIZATION.REPORT_HASH_MISMATCH',
  claimMismatch: 'TVA.REVIEW.FINALIZATION.CLAIM_MISMATCH',
  evidenceMismatch: 'TVA.REVIEW.FINALIZATION.EVIDENCE_MISMATCH',
  evidenceUnavailable: 'TVA.REVIEW.FINALIZATION.EVIDENCE_UNAVAILABLE',
  evidenceSufficiency: 'TVA.REVIEW.FINALIZATION.EVIDENCE_SUFFICIENCY',
  capabilityEvidenceRequired: 'TVA.REVIEW.FINALIZATION.CAPABILITY_EVIDENCE_REQUIRED',
  capabilityConfidenceRequired: 'TVA.REVIEW.FINALIZATION.CAPABILITY_CONFIDENCE_REQUIRED',
  governanceState: 'TVA.REVIEW.FINALIZATION.GOVERNANCE_STATE_INVALID',
  conflictingObservations: 'TVA.REVIEW.FINALIZATION.CONFLICTING_OBSERVATIONS',
} as const)

export type ReviewFinalizationReadinessCode =
  (typeof REVIEW_FINALIZATION_READINESS_CODES)[keyof typeof REVIEW_FINALIZATION_READINESS_CODES]

export interface ReviewFinalizationReadinessExpectedContext {
  readonly reviewWorkflowId: string
  readonly reviewSessionId: string
  readonly taskAssignmentId: string
  readonly assignmentSnapshotId: string
  readonly assignmentSnapshotHash: TvaSha256
  readonly completionReportId: string
  readonly completionReportHash: TvaSha256
  readonly completionClaimId: string | null
}

export interface ReviewFinalizationReadinessEvidence {
  readonly evidenceId: string
  readonly reviewerAccessState: 'available' | 'restricted' | 'unavailable' | 'unknown'
}

export interface ReviewFinalizationReadinessObservation {
  readonly observation: ReviewObservationV1
  /** True only for the revision selected by the observation aggregate anchor. */
  readonly current: boolean
  readonly revisionHash: TvaSha256
  readonly completionReportId: string
  readonly completionReportHash: TvaSha256
  readonly completionClaimId: string | null
  readonly evidenceSufficiency: ReviewEvidenceSufficiencyV1
  readonly evidence: readonly ReviewFinalizationReadinessEvidence[]
}

export interface ReviewFinalizationReadinessInput {
  readonly expected: ReviewFinalizationReadinessExpectedContext
  readonly observations: readonly ReviewFinalizationReadinessObservation[]
}

export interface ReviewFinalizationReadinessResult {
  /** Deliberately always false until a governed native finalization policy exists. */
  readonly finalizationAuthorized: false
  readonly policyStatus: 'not_evaluated'
  readonly blockerCodes: readonly ReviewFinalizationReadinessCode[]
  readonly currentObservationIds: readonly string[]
  readonly staleObservationIds: readonly string[]
  readonly conflictTargetRefs: readonly string[]
}

const FINAL_CAPABILITY_DISPOSITIONS = new Set<ReviewObservationV1['disposition']>([
  'confirm',
  'refine',
  'narrow',
  'partially_verify',
])

function addCode(
  codes: Set<ReviewFinalizationReadinessCode>,
  code: ReviewFinalizationReadinessCode
) {
  codes.add(code)
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false
  const rightIds = new Set(right)
  return new Set(left).size === left.length && left.every((id) => rightIds.has(id))
}

function evaluateCurrentObservation(
  input: ReviewFinalizationReadinessInput,
  candidate: ReviewFinalizationReadinessObservation,
  codes: Set<ReviewFinalizationReadinessCode>
): void {
  const { expected } = input
  const { observation } = candidate

  if (observation.reviewWorkflowId !== expected.reviewWorkflowId) {
    addCode(codes, REVIEW_FINALIZATION_READINESS_CODES.workflowMismatch)
  }
  if (observation.reviewSessionId !== expected.reviewSessionId) {
    addCode(codes, REVIEW_FINALIZATION_READINESS_CODES.sessionMismatch)
  }
  if (observation.taskAssignmentId !== expected.taskAssignmentId) {
    addCode(codes, REVIEW_FINALIZATION_READINESS_CODES.assignmentMismatch)
  }
  if (
    observation.assignmentSnapshotId !== expected.assignmentSnapshotId ||
    observation.sourceSnapshotHash !== expected.assignmentSnapshotHash
  ) {
    addCode(codes, REVIEW_FINALIZATION_READINESS_CODES.snapshotMismatch)
  }
  if (candidate.completionReportId !== expected.completionReportId) {
    addCode(codes, REVIEW_FINALIZATION_READINESS_CODES.reportMismatch)
  }
  if (candidate.completionReportHash !== expected.completionReportHash) {
    addCode(codes, REVIEW_FINALIZATION_READINESS_CODES.reportHashMismatch)
  }
  if (candidate.completionClaimId !== expected.completionClaimId) {
    addCode(codes, REVIEW_FINALIZATION_READINESS_CODES.claimMismatch)
  }
  if (expected.completionClaimId !== null && observation.targetRef !== expected.completionClaimId) {
    addCode(codes, REVIEW_FINALIZATION_READINESS_CODES.claimMismatch)
  }

  const evidenceIds = candidate.evidence.map((item) => item.evidenceId)
  if (!sameIds(observation.evidenceRefs, evidenceIds)) {
    addCode(codes, REVIEW_FINALIZATION_READINESS_CODES.evidenceMismatch)
  }
  if (candidate.evidence.some((item) => item.reviewerAccessState !== 'available')) {
    addCode(codes, REVIEW_FINALIZATION_READINESS_CODES.evidenceUnavailable)
  }
  if (
    candidate.evidenceSufficiency !== 'adequate' &&
    candidate.evidenceSufficiency !== 'governed_exception'
  ) {
    addCode(codes, REVIEW_FINALIZATION_READINESS_CODES.evidenceSufficiency)
  }

  if (
    observation.observationType === 'capability' &&
    observation.governanceState === 'final' &&
    FINAL_CAPABILITY_DISPOSITIONS.has(observation.disposition)
  ) {
    if (observation.evidenceRefs.length === 0) {
      addCode(codes, REVIEW_FINALIZATION_READINESS_CODES.capabilityEvidenceRequired)
    }
    if (observation.confidence === null) {
      addCode(codes, REVIEW_FINALIZATION_READINESS_CODES.capabilityConfidenceRequired)
    }
  }

  if (observation.governanceState !== 'final' || observation.finalizedAt === null) {
    addCode(codes, REVIEW_FINALIZATION_READINESS_CODES.governanceState)
  }
}

function findConflictTargetRefs(
  observations: readonly ReviewFinalizationReadinessObservation[]
): readonly string[] {
  const dispositionsByTarget = new Map<string, Set<ReviewObservationV1['disposition']>>()
  for (const candidate of observations) {
    const dispositions = dispositionsByTarget.get(candidate.observation.targetRef) ?? new Set()
    dispositions.add(candidate.observation.disposition)
    dispositionsByTarget.set(candidate.observation.targetRef, dispositions)
  }
  return [...dispositionsByTarget.entries()]
    .filter(([, dispositions]) => dispositions.size > 1)
    .map(([targetRef]) => targetRef)
    .sort()
}

export function evaluateReviewFinalizationReadiness(
  input: ReviewFinalizationReadinessInput
): ReviewFinalizationReadinessResult {
  const codes = new Set<ReviewFinalizationReadinessCode>()
  const current = input.observations.filter((candidate) => candidate.current)
  const stale = input.observations.filter((candidate) => !candidate.current)

  addCode(codes, REVIEW_FINALIZATION_READINESS_CODES.policyUnresolved)
  if (current.length === 0) {
    addCode(codes, REVIEW_FINALIZATION_READINESS_CODES.observationRequired)
  }
  if (stale.length > 0) {
    addCode(codes, REVIEW_FINALIZATION_READINESS_CODES.staleRevision)
  }

  for (const candidate of current) evaluateCurrentObservation(input, candidate, codes)

  const conflictTargetRefs = findConflictTargetRefs(current)
  if (conflictTargetRefs.length > 0) {
    addCode(codes, REVIEW_FINALIZATION_READINESS_CODES.conflictingObservations)
  }

  return {
    finalizationAuthorized: false,
    policyStatus: 'not_evaluated',
    blockerCodes: [...codes].sort(),
    currentObservationIds: current.map(({ observation }) => observation.id).sort(),
    staleObservationIds: stale.map(({ observation }) => observation.id).sort(),
    conflictTargetRefs,
  }
}
