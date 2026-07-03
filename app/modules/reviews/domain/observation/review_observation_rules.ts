import type {
  CompletionClaimV1,
  ReviewObservationV1,
} from '#modules/reviews/public_contracts/observation/completion_review_contracts'
import type { ReviewEvidenceSufficiencyV1 as ReviewEvidenceSufficiency } from '#modules/reviews/public_contracts/observation/review_governance_primitives'
import type {
  TvaJsonObject,
  TvaOwnershipLevel,
} from '#modules/tasks/public_contracts/task-authoring/primitives'
import {
  isCompletionClaimV1,
  isReviewObservationV1,
} from '#modules/tasks/public_contracts/task-authoring/validators'

export const REVIEW_OBSERVATION_CODES = Object.freeze({
  contractInvalid: 'TVA.REVIEW.OBSERVATION.CONTRACT_INVALID',
  reviewerIdentityMismatch: 'TVA.REVIEW.OBSERVATION.REVIEWER_IDENTITY_MISMATCH',
  reviewerIneligible: 'TVA.REVIEW.OBSERVATION.REVIEWER_INELIGIBLE',
  selfReviewForbidden: 'TVA.REVIEW.OBSERVATION.SELF_REVIEW_FORBIDDEN',
  reviewerConflict: 'TVA.REVIEW.OBSERVATION.REVIEWER_CONFLICT',
  sourceSnapshotHashMismatch: 'TVA.REVIEW.OBSERVATION.SOURCE_SNAPSHOT_HASH_MISMATCH',
  aiFinalizationForbidden: 'TVA.REVIEW.OBSERVATION.AI_FINALIZATION_FORBIDDEN',
  claimRequired: 'TVA.REVIEW.OBSERVATION.CLAIM_REQUIRED',
  claimBoundaryMismatch: 'TVA.REVIEW.OBSERVATION.CLAIM_BOUNDARY_MISMATCH',
  claimScopeExpanded: 'TVA.REVIEW.OBSERVATION.CLAIM_SCOPE_EXPANDED',
  ownershipExpanded: 'TVA.REVIEW.OBSERVATION.OWNERSHIP_EXPANDED',
  evidenceLinkMismatch: 'TVA.REVIEW.OBSERVATION.EVIDENCE_LINK_MISMATCH',
  evidenceAccessInsufficient: 'TVA.REVIEW.OBSERVATION.EVIDENCE_ACCESS_INSUFFICIENT',
  evidenceSufficiencyInsufficient: 'TVA.REVIEW.OBSERVATION.EVIDENCE_SUFFICIENCY_INSUFFICIENT',
  capabilityTaxonomyRequired: 'TVA.REVIEW.OBSERVATION.CAPABILITY_TAXONOMY_REQUIRED',
  capabilityEvidenceRequired: 'TVA.REVIEW.OBSERVATION.CAPABILITY_EVIDENCE_REQUIRED',
  capabilityConfidenceRequired: 'TVA.REVIEW.OBSERVATION.CAPABILITY_CONFIDENCE_REQUIRED',
  assessmentCeilingRequired: 'TVA.REVIEW.OBSERVATION.ASSESSMENT_CEILING_REQUIRED',
  assessmentCeilingExceeded: 'TVA.REVIEW.OBSERVATION.ASSESSMENT_CEILING_EXCEEDED',
} as const)

export type ReviewObservationCode =
  (typeof REVIEW_OBSERVATION_CODES)[keyof typeof REVIEW_OBSERVATION_CODES]

export interface ReviewObservationEvidenceAccess {
  readonly evidenceId: string
  readonly reviewerAccessState: 'available' | 'restricted' | 'unavailable' | 'unknown'
}

export interface ReviewObservationRuleInput {
  readonly actorId: string
  readonly reviewerEligible: boolean
  readonly reviewerConflict: boolean
  readonly authorizedAssessmentCeiling: number | null
  readonly evidenceSufficiency: ReviewEvidenceSufficiency
  readonly observation: ReviewObservationV1
  readonly completionClaim: CompletionClaimV1 | null
  readonly evidenceAccess: readonly ReviewObservationEvidenceAccess[]
}

export interface ReviewObservationRuleResult {
  readonly allowed: boolean
  readonly blockerCodes: readonly ReviewObservationCode[]
}

const VERIFYING_DISPOSITIONS = new Set<ReviewObservationV1['disposition']>([
  'confirm',
  'refine',
  'narrow',
  'partially_verify',
])
const OWNERSHIP_RANK: Readonly<Record<TvaOwnershipLevel, number>> = {
  contributor: 1,
  shared_owner: 2,
  primary_owner: 3,
  lead: 4,
}

function stringValue(value: TvaJsonObject, key: string): string | null {
  const candidate = value[key]
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : null
}

function stringArray(value: TvaJsonObject, key: string): readonly string[] | null {
  const candidate = value[key]
  return Array.isArray(candidate) && candidate.every((item) => typeof item === 'string')
    ? candidate
    : null
}

function containsOnly(values: readonly string[] | null, allowed: readonly string[]): boolean {
  return values === null || values.every((value) => allowed.includes(value))
}

function isOwnershipLevel(value: string): value is TvaOwnershipLevel {
  return Object.hasOwn(OWNERSHIP_RANK, value)
}

function claimObservationBlockers(
  observation: ReviewObservationV1,
  claim: CompletionClaimV1 | null
): ReviewObservationCode[] {
  if (!claim || !isCompletionClaimV1(claim)) {
    return [REVIEW_OBSERVATION_CODES.claimRequired]
  }
  const blockers: ReviewObservationCode[] = []
  if (
    observation.targetRef !== claim.id ||
    observation.subjectUserId !== claim.userId ||
    observation.assignmentSnapshotId !== claim.assignmentSnapshotId
  ) {
    blockers.push(REVIEW_OBSERVATION_CODES.claimBoundaryMismatch)
  }
  const value = observation.structuredValue
  const reviewedAction = stringValue(value, 'action')
  const reviewedObject = stringValue(value, 'object')
  if (
    (reviewedAction !== null && reviewedAction !== claim.action) ||
    (reviewedObject !== null && reviewedObject !== claim.object) ||
    !containsOnly(stringArray(value, 'deliverableRefs'), claim.deliverableRefs) ||
    !containsOnly(stringArray(value, 'criterionResultRefs'), claim.criterionResultRefs) ||
    !containsOnly(stringArray(value, 'evidenceRefs'), claim.evidenceRefs)
  ) {
    blockers.push(REVIEW_OBSERVATION_CODES.claimScopeExpanded)
  }
  const reviewedOwnership = stringValue(value, 'actualOwnership')
  if (
    reviewedOwnership !== null &&
    (!isOwnershipLevel(reviewedOwnership) ||
      OWNERSHIP_RANK[reviewedOwnership] > OWNERSHIP_RANK[claim.actualOwnership])
  ) {
    blockers.push(REVIEW_OBSERVATION_CODES.ownershipExpanded)
  }
  return blockers
}

export function validateReviewObservation(
  input: ReviewObservationRuleInput
): ReviewObservationRuleResult {
  const blockers = new Set<ReviewObservationCode>()
  const observation = input.observation
  if (!isReviewObservationV1(observation)) {
    return { allowed: false, blockerCodes: [REVIEW_OBSERVATION_CODES.contractInvalid] }
  }
  if (observation.reviewerId !== input.actorId) {
    blockers.add(REVIEW_OBSERVATION_CODES.reviewerIdentityMismatch)
  }
  if (!input.reviewerEligible) blockers.add(REVIEW_OBSERVATION_CODES.reviewerIneligible)
  if (observation.subjectUserId === input.actorId) {
    blockers.add(REVIEW_OBSERVATION_CODES.selfReviewForbidden)
  }
  if (input.reviewerConflict) blockers.add(REVIEW_OBSERVATION_CODES.reviewerConflict)
  if (observation.reviewerType !== 'human' && observation.governanceState !== 'draft') {
    blockers.add(REVIEW_OBSERVATION_CODES.aiFinalizationForbidden)
  }

  if (
    observation.observationType === 'accomplishment_claim' ||
    observation.observationType === 'ownership'
  ) {
    for (const code of claimObservationBlockers(observation, input.completionClaim)) {
      blockers.add(code)
    }
  }

  const evidenceIds = input.evidenceAccess.map((item) => item.evidenceId)
  if (
    new Set(evidenceIds).size !== evidenceIds.length ||
    observation.evidenceRefs.length !== evidenceIds.length ||
    observation.evidenceRefs.some((id) => !evidenceIds.includes(id))
  ) {
    blockers.add(REVIEW_OBSERVATION_CODES.evidenceLinkMismatch)
  }
  const finalVerification =
    observation.governanceState !== 'draft' && VERIFYING_DISPOSITIONS.has(observation.disposition)
  if (
    finalVerification &&
    input.evidenceAccess.some((item) => item.reviewerAccessState !== 'available')
  ) {
    blockers.add(REVIEW_OBSERVATION_CODES.evidenceAccessInsufficient)
  }
  if (finalVerification && input.evidenceSufficiency !== 'adequate') {
    blockers.add(REVIEW_OBSERVATION_CODES.evidenceSufficiencyInsufficient)
  }

  if (observation.observationType === 'capability') {
    if (finalVerification && observation.evidenceRefs.length === 0) {
      blockers.add(REVIEW_OBSERVATION_CODES.capabilityEvidenceRequired)
    }
    if (finalVerification && observation.confidence === null) {
      blockers.add(REVIEW_OBSERVATION_CODES.capabilityConfidenceRequired)
    }
    if (!observation.capabilityTaxonomyVersion) {
      blockers.add(REVIEW_OBSERVATION_CODES.capabilityTaxonomyRequired)
    }
    if (observation.assessmentCeiling === null) {
      blockers.add(REVIEW_OBSERVATION_CODES.assessmentCeilingRequired)
    } else if (
      input.authorizedAssessmentCeiling === null ||
      observation.assessmentCeiling > input.authorizedAssessmentCeiling
    ) {
      blockers.add(REVIEW_OBSERVATION_CODES.assessmentCeilingExceeded)
    }
  }

  return { allowed: blockers.size === 0, blockerCodes: [...blockers].sort() }
}
