import type {
  CompletionClaimV1,
  ReviewObservationV1,
} from '#modules/reviews/public_contracts/observation/completion_review_contracts'
import type {
  TvaOwnershipLevel,
  TvaSha256,
} from '#modules/tasks/public_contracts/task-authoring/primitives'
import type { ReviewEvidenceSufficiencyV1 as ReviewEvidenceSufficiency } from '#modules/reviews/public_contracts/observation/review_governance_primitives'
import {
  isCompletionClaimV1,
  isReviewObservationV1,
} from '#modules/tasks/public_contracts/task-authoring/validators'

export const VERIFIED_ACCOMPLISHMENT_GATE_CODES = Object.freeze({
  contractInvalid: 'TVA.ACCOMPLISHMENT.GATE.CONTRACT_INVALID',
  profileIneligible: 'TVA.ACCOMPLISHMENT.GATE.PROFILE_INELIGIBLE',
  reviewerQuorumMissing: 'TVA.ACCOMPLISHMENT.GATE.REVIEWER_QUORUM_MISSING',
  reviewerIneligible: 'TVA.ACCOMPLISHMENT.GATE.REVIEWER_INELIGIBLE',
  reviewPolicyMismatch: 'TVA.ACCOMPLISHMENT.GATE.REVIEW_POLICY_MISMATCH',
  unresolvedDispute: 'TVA.ACCOMPLISHMENT.GATE.UNRESOLVED_DISPUTE',
  provenanceMismatch: 'TVA.ACCOMPLISHMENT.GATE.PROVENANCE_MISMATCH',
  claimStateIneligible: 'TVA.ACCOMPLISHMENT.GATE.CLAIM_STATE_INELIGIBLE',
  finalHumanDecisionMissing: 'TVA.ACCOMPLISHMENT.GATE.FINAL_HUMAN_DECISION_MISSING',
  evidenceInsufficient: 'TVA.ACCOMPLISHMENT.GATE.EVIDENCE_INSUFFICIENT',
  claimBoundaryExpanded: 'TVA.ACCOMPLISHMENT.GATE.CLAIM_BOUNDARY_EXPANDED',
  ownershipUnconfirmed: 'TVA.ACCOMPLISHMENT.GATE.OWNERSHIP_UNCONFIRMED',
  conflictingDecisions: 'TVA.ACCOMPLISHMENT.GATE.CONFLICTING_DECISIONS',
} as const)

export type VerifiedAccomplishmentGateCode =
  (typeof VERIFIED_ACCOMPLISHMENT_GATE_CODES)[keyof typeof VERIFIED_ACCOMPLISHMENT_GATE_CODES]

export interface GovernedReviewObservationInput {
  readonly observation: ReviewObservationV1
  readonly revisionHash: TvaSha256
  readonly evidenceSufficiency: ReviewEvidenceSufficiency
}

export interface VerifiedAccomplishmentGateInput {
  readonly profileEligible: boolean
  readonly requiredReviewerQuorumMet: boolean
  readonly requiredReviewerCount: number
  readonly expectedReviewPolicyVersion: string
  readonly unresolvedDispute: boolean
  readonly taskAssignmentId: string
  readonly assignmentSnapshotId: string
  readonly assignmentSnapshotHash: TvaSha256
  readonly taskSpecificationVersionId: string
  readonly taskSpecificationHash: TvaSha256
  readonly taskContractVersionId: string
  readonly taskContractHash: TvaSha256
  readonly completionReportId: string
  readonly completionReportHash: TvaSha256
  readonly reviewWorkflowId: string
  readonly reviewHash: TvaSha256
  readonly claim: CompletionClaimV1
  readonly claimHash: TvaSha256
  readonly observations: readonly GovernedReviewObservationInput[]
}

export interface VerifiedAccomplishmentGateBlocked {
  readonly allowed: false
  readonly blockerCodes: readonly VerifiedAccomplishmentGateCode[]
}

export interface VerifiedAccomplishmentGatePassed {
  readonly allowed: true
  readonly blockerCodes: readonly []
  readonly lifecycleState: 'verified' | 'partially_verified'
  readonly action: string
  readonly object: string
  readonly ownershipLevel: TvaOwnershipLevel
  readonly deliverableIds: readonly string[]
  readonly criterionResultIds: readonly string[]
  readonly evidenceIds: readonly string[]
  readonly reviewObservationIds: readonly string[]
  readonly reviewObservationHashes: readonly TvaSha256[]
  readonly reviewerReferences: readonly {
    readonly reviewerId: string
    readonly reviewerRole: string
  }[]
}

export type VerifiedAccomplishmentGateResult =
  | VerifiedAccomplishmentGateBlocked
  | VerifiedAccomplishmentGatePassed

const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const VERIFYING_DISPOSITIONS = new Set<ReviewObservationV1['disposition']>([
  'confirm',
  'refine',
  'narrow',
  'partially_verify',
])
const ELIGIBLE_CLAIM_STATES = new Set<CompletionClaimV1['status']>([
  'under_review',
  'partially_verified',
  'verified',
])
const OWNERSHIP_RANK: Readonly<Record<TvaOwnershipLevel, number>> = {
  contributor: 1,
  shared_owner: 2,
  primary_owner: 3,
  lead: 4,
}

function isOwnershipLevel(value: unknown): value is TvaOwnershipLevel {
  return typeof value === 'string' && Object.hasOwn(OWNERSHIP_RANK, value)
}

function stringValue(observation: ReviewObservationV1, key: string): string | null {
  const value = observation.structuredValue[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function stringArray(observation: ReviewObservationV1, key: string): readonly string[] | null {
  const value = observation.structuredValue[key]
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : null
}

function isSubset(values: readonly string[], allowed: readonly string[]): boolean {
  return values.every((value) => allowed.includes(value))
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort()
}

function provenanceFieldsAreValid(input: VerifiedAccomplishmentGateInput): boolean {
  const ids = [
    input.taskAssignmentId,
    input.assignmentSnapshotId,
    input.taskSpecificationVersionId,
    input.taskContractVersionId,
    input.completionReportId,
    input.reviewWorkflowId,
    input.claim.id,
  ]
  const hashes = [
    input.assignmentSnapshotHash,
    input.taskSpecificationHash,
    input.taskContractHash,
    input.completionReportHash,
    input.reviewHash,
    input.claimHash,
  ]
  return ids.every((id) => UUID_PATTERN.test(id)) && hashes.every((hash) => SHA256_PATTERN.test(hash))
}

function decisionBoundary(observation: ReviewObservationV1, claim: CompletionClaimV1) {
  const action = stringValue(observation, 'action') ?? claim.action
  const object = stringValue(observation, 'object') ?? claim.object
  const ownership = stringValue(observation, 'actualOwnership')
  const deliverableIds = sortedUnique(
    stringArray(observation, 'deliverableRefs') ?? claim.deliverableRefs
  )
  const criterionResultIds = sortedUnique(
    stringArray(observation, 'criterionResultRefs') ?? claim.criterionResultRefs
  )
  const evidenceIds = sortedUnique(stringArray(observation, 'evidenceRefs') ?? observation.evidenceRefs)
  return {
    action,
    object,
    ownership,
    deliverableIds,
    criterionResultIds,
    evidenceIds,
    lifecycleState:
      observation.disposition === 'partially_verify'
        ? ('partially_verified' as const)
        : ('verified' as const),
  }
}

export function evaluateVerifiedAccomplishmentGate(
  input: VerifiedAccomplishmentGateInput
): VerifiedAccomplishmentGateResult {
  const blockers = new Set<VerifiedAccomplishmentGateCode>()
  if (!isCompletionClaimV1(input.claim) || !provenanceFieldsAreValid(input)) {
    blockers.add(VERIFIED_ACCOMPLISHMENT_GATE_CODES.contractInvalid)
  }
  if (
    !Number.isSafeInteger(input.requiredReviewerCount) ||
    input.requiredReviewerCount < 1 ||
    input.requiredReviewerCount > 50 ||
    !input.expectedReviewPolicyVersion.trim()
  ) {
    blockers.add(VERIFIED_ACCOMPLISHMENT_GATE_CODES.contractInvalid)
  }
  if (!input.profileEligible) blockers.add(VERIFIED_ACCOMPLISHMENT_GATE_CODES.profileIneligible)
  if (!input.requiredReviewerQuorumMet) {
    blockers.add(VERIFIED_ACCOMPLISHMENT_GATE_CODES.reviewerQuorumMissing)
  }
  if (input.unresolvedDispute) {
    blockers.add(VERIFIED_ACCOMPLISHMENT_GATE_CODES.unresolvedDispute)
  }
  if (!ELIGIBLE_CLAIM_STATES.has(input.claim.status)) {
    blockers.add(VERIFIED_ACCOMPLISHMENT_GATE_CODES.claimStateIneligible)
  }
  if (
    input.claim.completionReportId !== input.completionReportId ||
    input.claim.completionReportHash !== input.completionReportHash ||
    input.claim.assignmentSnapshotId !== input.assignmentSnapshotId ||
    input.claim.taskContractVersionId !== input.taskContractVersionId
  ) {
    blockers.add(VERIFIED_ACCOMPLISHMENT_GATE_CODES.provenanceMismatch)
  }

  const verifying = input.observations.filter(({ observation }) => {
    return (
      isReviewObservationV1(observation) &&
      observation.observationType === 'accomplishment_claim' &&
      observation.targetRef === input.claim.id &&
      observation.governanceState === 'final' &&
      observation.reviewerType === 'human' &&
      observation.finalizedAt !== null &&
      VERIFYING_DISPOSITIONS.has(observation.disposition)
    )
  })
  if (verifying.length === 0) {
    blockers.add(VERIFIED_ACCOMPLISHMENT_GATE_CODES.finalHumanDecisionMissing)
  }

  const boundaries = verifying.map(({ observation, revisionHash, evidenceSufficiency }) => {
    if (!SHA256_PATTERN.test(revisionHash)) {
      blockers.add(VERIFIED_ACCOMPLISHMENT_GATE_CODES.contractInvalid)
    }
    if (
      observation.reviewWorkflowId !== input.reviewWorkflowId ||
      observation.taskAssignmentId !== input.taskAssignmentId ||
      observation.assignmentSnapshotId !== input.assignmentSnapshotId ||
      observation.sourceSnapshotHash !== input.assignmentSnapshotHash ||
      observation.subjectUserId !== input.claim.userId
    ) {
      blockers.add(VERIFIED_ACCOMPLISHMENT_GATE_CODES.provenanceMismatch)
    }
    if (observation.reviewerId === input.claim.userId) {
      blockers.add(VERIFIED_ACCOMPLISHMENT_GATE_CODES.reviewerIneligible)
    }
    if (observation.reviewPolicyVersion !== input.expectedReviewPolicyVersion) {
      blockers.add(VERIFIED_ACCOMPLISHMENT_GATE_CODES.reviewPolicyMismatch)
    }
    if (evidenceSufficiency !== 'adequate') {
      blockers.add(VERIFIED_ACCOMPLISHMENT_GATE_CODES.evidenceInsufficient)
    }
    const boundary = decisionBoundary(observation, input.claim)
    if (!isOwnershipLevel(boundary.ownership)) {
      blockers.add(VERIFIED_ACCOMPLISHMENT_GATE_CODES.ownershipUnconfirmed)
    } else if (OWNERSHIP_RANK[boundary.ownership] > OWNERSHIP_RANK[input.claim.actualOwnership]) {
      blockers.add(VERIFIED_ACCOMPLISHMENT_GATE_CODES.claimBoundaryExpanded)
    }
    if (
      boundary.action !== input.claim.action ||
      boundary.object !== input.claim.object ||
      !isSubset(boundary.deliverableIds, input.claim.deliverableRefs) ||
      !isSubset(boundary.criterionResultIds, input.claim.criterionResultRefs) ||
      !isSubset(boundary.evidenceIds, input.claim.evidenceRefs) ||
      !isSubset(observation.evidenceRefs, input.claim.evidenceRefs)
    ) {
      blockers.add(VERIFIED_ACCOMPLISHMENT_GATE_CODES.claimBoundaryExpanded)
    }
    return boundary
  })

  const reviewerIds = verifying.map(({ observation }) => observation.reviewerId)
  const observationIds = verifying.map(({ observation }) => observation.id)
  const decisionSignatures = boundaries.map((boundary) => JSON.stringify(boundary))
  if (
    new Set(reviewerIds).size !== reviewerIds.length ||
    new Set(observationIds).size !== observationIds.length ||
    new Set(decisionSignatures).size > 1
  ) {
    blockers.add(VERIFIED_ACCOMPLISHMENT_GATE_CODES.conflictingDecisions)
  }
  const governedReviewerCount = new Set(
    verifying
      .filter(
        ({ observation }) =>
          observation.reviewerId !== input.claim.userId &&
          observation.reviewPolicyVersion === input.expectedReviewPolicyVersion
      )
      .map(({ observation }) => observation.reviewerId)
  ).size
  if (governedReviewerCount < input.requiredReviewerCount) {
    blockers.add(VERIFIED_ACCOMPLISHMENT_GATE_CODES.reviewerQuorumMissing)
  }

  if (blockers.size > 0 || boundaries.length === 0) {
    return { allowed: false, blockerCodes: [...blockers].sort() }
  }
  const boundary = boundaries[0]
  if (!boundary || !isOwnershipLevel(boundary.ownership)) {
    return {
      allowed: false,
      blockerCodes: [VERIFIED_ACCOMPLISHMENT_GATE_CODES.ownershipUnconfirmed],
    }
  }
  const ordered = [...verifying].sort((left, right) =>
    left.observation.id.localeCompare(right.observation.id)
  )
  return {
    allowed: true,
    blockerCodes: [],
    lifecycleState: boundary.lifecycleState,
    action: boundary.action,
    object: boundary.object,
    ownershipLevel: boundary.ownership,
    deliverableIds: boundary.deliverableIds,
    criterionResultIds: boundary.criterionResultIds,
    evidenceIds: boundary.evidenceIds,
    reviewObservationIds: ordered.map(({ observation }) => observation.id),
    reviewObservationHashes: ordered.map(({ revisionHash }) => revisionHash),
    reviewerReferences: ordered.map(({ observation }) => ({
      reviewerId: observation.reviewerId,
      reviewerRole: observation.reviewerType,
    })),
  }
}
