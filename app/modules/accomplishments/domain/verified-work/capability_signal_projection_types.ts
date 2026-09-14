import type { VerifiedAccomplishmentGateResult } from './verified_accomplishment_projection_rules.js'

import type { AccomplishmentCapabilitySignalV1 } from '#modules/accomplishments/public_contracts/verified-work/accomplishment_capability_signal_v1'
import type { AccomplishmentConfidenceBandV1 } from '#modules/accomplishments/public_contracts/verified-work/accomplishment_contract_primitives_v1'
import type { ReviewObservationV1 } from '#modules/reviews/public_contracts/observation/completion_review_contracts'
import type { TvaSha256 } from '#modules/tasks/public_contracts/task-authoring/primitives'

export const CAPABILITY_SIGNAL_PROJECTION_CODES = Object.freeze({
  accomplishmentGateNotPassed: 'TVA.CAPABILITY_SIGNAL.ACCOMPLISHMENT_GATE_NOT_PASSED',
  contractInvalid: 'TVA.CAPABILITY_SIGNAL.CONTRACT_INVALID',
  finalHumanGovernedObservationRequired:
    'TVA.CAPABILITY_SIGNAL.FINAL_HUMAN_GOVERNED_OBSERVATION_REQUIRED',
  verifyingDispositionRequired: 'TVA.CAPABILITY_SIGNAL.VERIFYING_DISPOSITION_REQUIRED',
  provenanceMismatch: 'TVA.CAPABILITY_SIGNAL.PROVENANCE_MISMATCH',
  evidenceMismatch: 'TVA.CAPABILITY_SIGNAL.EVIDENCE_MISMATCH',
  evidenceUnavailable: 'TVA.CAPABILITY_SIGNAL.EVIDENCE_UNAVAILABLE',
  taxonomyMismatch: 'TVA.CAPABILITY_SIGNAL.TAXONOMY_MISMATCH',
  policyMismatch: 'TVA.CAPABILITY_SIGNAL.POLICY_MISMATCH',
  capabilityDataInvalid: 'TVA.CAPABILITY_SIGNAL.CAPABILITY_DATA_INVALID',
  assessmentScaleInvalid: 'TVA.CAPABILITY_SIGNAL.ASSESSMENT_SCALE_INVALID',
  duplicateSource: 'TVA.CAPABILITY_SIGNAL.DUPLICATE_SOURCE',
} as const)

export type CapabilitySignalProjectionCode =
  (typeof CAPABILITY_SIGNAL_PROJECTION_CODES)[keyof typeof CAPABILITY_SIGNAL_PROJECTION_CODES]

export type CapabilityEvidenceAccessState =
  | 'available'
  | 'restricted'
  | 'unavailable'
  | 'unknown'

export type CapabilityEvidenceVerificationStrength = 'weak' | 'moderate' | 'strong'

export interface CapabilitySignalEvidenceFact {
  readonly id: string
  readonly contentHash: TvaSha256
  readonly accessState: CapabilityEvidenceAccessState
  readonly verificationStrength: CapabilityEvidenceVerificationStrength
}

export interface GovernedCapabilityEvidenceBoundaryFact {
  readonly id: string
  readonly contentHash: TvaSha256 | null
  readonly accessState: CapabilityEvidenceAccessState
}

export interface GovernedCapabilityObservationSource {
  readonly observation: ReviewObservationV1
  readonly revisionHash: TvaSha256
  readonly authorizedAssessmentCeiling: number
  readonly evidence: readonly CapabilitySignalEvidenceFact[]
}

export interface CapabilitySignalLevelScaleEntry {
  readonly level: number
  readonly code: string
}

export interface CapabilitySignalAccomplishmentBoundary {
  readonly id: string
  readonly subjectUserId: string
  readonly taskAssignmentId: string
  readonly assignmentSnapshotId: string
  readonly assignmentSnapshotHash: TvaSha256
  readonly evidence: readonly GovernedCapabilityEvidenceBoundaryFact[]
  readonly gate: VerifiedAccomplishmentGateResult
}

export interface CapabilitySignalProjectionInput {
  readonly accomplishment: CapabilitySignalAccomplishmentBoundary
  readonly expectedReviewPolicyVersion: string
  readonly expectedCapabilityTaxonomyVersion: string
  readonly signalPolicyVersion: string
  readonly levelScale: readonly CapabilitySignalLevelScaleEntry[]
  readonly observations: readonly GovernedCapabilityObservationSource[]
}

export interface CapabilitySignalProjectionProvenance {
  readonly accomplishment: {
    readonly id: string
    readonly lifecycleState: 'verified' | 'partially_verified'
  }
  readonly assignmentSnapshot: {
    readonly id: string
    readonly hash: TvaSha256
  }
  readonly observation: {
    readonly id: string
    readonly revision: number
    readonly revisionHash: TvaSha256
    readonly reviewWorkflowId: string
    readonly reviewPolicyVersion: string
    readonly reviewerId: string
  }
  readonly evidence: readonly CapabilitySignalEvidenceFact[]
  readonly taxonomy: {
    readonly capabilityId: string
    readonly version: string
  }
  readonly context: {
    readonly action: string
    readonly object: string
    readonly ownershipLevel: AccomplishmentCapabilitySignalV1['context']['ownershipLevel']
    readonly complexitySummary: string | null
  }
  readonly assessment: {
    readonly observedLevel: number | null
    readonly observationCeiling: number
    readonly authorizedCeiling: number
    readonly effectiveObservedLevel: number | null
    readonly effectiveCeiling: number
    readonly effectiveObservedLevelCode: string
    readonly effectiveCeilingCode: string
    readonly levelScale: readonly CapabilitySignalLevelScaleEntry[]
    readonly confidence: number
  }
  readonly signalPolicyVersion: string
}

export interface GovernedCapabilitySignalProjection {
  readonly projectionKey: string
  readonly sourceHash: TvaSha256
  readonly signal: AccomplishmentCapabilitySignalV1
  readonly provenance: CapabilitySignalProjectionProvenance
}

export interface CapabilitySignalProjectionBlocked {
  readonly allowed: false
  readonly blockerCodes: readonly CapabilitySignalProjectionCode[]
}

export interface CapabilitySignalProjectionPassed {
  readonly allowed: true
  readonly blockerCodes: readonly []
  readonly signals: readonly GovernedCapabilitySignalProjection[]
}

export type CapabilitySignalProjectionResult =
  | CapabilitySignalProjectionBlocked
  | CapabilitySignalProjectionPassed

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/
export const VERIFYING_DISPOSITIONS = new Set<ReviewObservationV1['disposition']>([
  'confirm',
  'refine',
  'narrow',
  'partially_verify',
])
export const DIRECTIONS = new Set(['positive', 'negative', 'neutral'])
export const APPLICABILITIES = new Set(['direct', 'supporting', 'contextual'])

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}

export function isSha256(value: string): value is TvaSha256 {
  return SHA256_PATTERN.test(value)
}

export function stringValue(observation: ReviewObservationV1, key: string): string | null {
  const value = observation.structuredValue[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function numberValue(observation: ReviewObservationV1, key: string): number | null {
  const value = observation.structuredValue[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function nullableStringValue(observation: ReviewObservationV1, key: string): string | null {
  const value = observation.structuredValue[key]
  return value === null ? null : stringValue(observation, key)
}

export function confidenceBand(confidence: number): AccomplishmentConfidenceBandV1 {
  if (confidence >= 0.8) return 'high'
  if (confidence >= 0.5) return 'medium'
  return 'low'
}

export function sortedEvidence(
  evidence: readonly CapabilitySignalEvidenceFact[]
): CapabilitySignalEvidenceFact[] {
  return [...evidence].sort(
    (left, right) =>
      left.id.localeCompare(right.id) || left.contentHash.localeCompare(right.contentHash)
  )
}

export function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort()
}

export function sameMembers(left: readonly string[], right: readonly string[]): boolean {
  const orderedLeft = sortedUnique(left)
  const orderedRight = sortedUnique(right)
  return (
    left.length === orderedLeft.length &&
    right.length === orderedRight.length &&
    orderedLeft.length === orderedRight.length &&
    orderedLeft.every((value, index) => value === orderedRight[index])
  )
}

export function levelCode(
  level: number,
  scale: readonly CapabilitySignalLevelScaleEntry[]
): string | null {
  return scale.find((entry) => entry.level === level)?.code ?? null
}

export function scaleIsValid(scale: readonly CapabilitySignalLevelScaleEntry[]): boolean {
  const levels = scale.map(({ level }) => level)
  const codes = scale.map(({ code }) => code)
  return (
    scale.length > 0 &&
    levels.every((level) => Number.isSafeInteger(level) && level >= 0) &&
    codes.every((code) => /^[a-z0-9][a-z0-9_.:-]{0,127}$/.test(code)) &&
    new Set(levels).size === levels.length &&
    new Set(codes).size === codes.length
  )
}

export function deterministicUuid(hash: TvaSha256): string {
  const source = hash.slice('sha256:'.length, 'sha256:'.length + 32).split('')
  source[12] = '5'
  source[16] = '8'
  const hex = source.join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}
