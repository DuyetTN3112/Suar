import type { VerifiedAccomplishmentGateResult } from './verified_accomplishment_projection_rules.js'

import type { AccomplishmentContentHasher } from '#modules/accomplishments/domain/verified-work/accomplishment_projection_identity'
import {
  parseAccomplishmentCapabilitySignalV1,
  type AccomplishmentCapabilitySignalV1,
} from '#modules/accomplishments/public_contracts/verified-work/accomplishment_capability_signal_v1'
import type { AccomplishmentConfidenceBandV1 } from '#modules/accomplishments/public_contracts/verified-work/accomplishment_contract_primitives_v1'
import type { ReviewObservationV1 } from '#modules/reviews/public_contracts/observation/completion_review_contracts'
import type { TvaSha256 } from '#modules/tasks/public_contracts/task-authoring/primitives'
import { isReviewObservationV1 } from '#modules/tasks/public_contracts/task-authoring/validators'

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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/
const VERIFYING_DISPOSITIONS = new Set<ReviewObservationV1['disposition']>([
  'confirm',
  'refine',
  'narrow',
  'partially_verify',
])
const DIRECTIONS = new Set(['positive', 'negative', 'neutral'])
const APPLICABILITIES = new Set(['direct', 'supporting', 'contextual'])

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}

function isSha256(value: string): value is TvaSha256 {
  return SHA256_PATTERN.test(value)
}

function stringValue(observation: ReviewObservationV1, key: string): string | null {
  const value = observation.structuredValue[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function numberValue(observation: ReviewObservationV1, key: string): number | null {
  const value = observation.structuredValue[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function nullableStringValue(observation: ReviewObservationV1, key: string): string | null {
  const value = observation.structuredValue[key]
  return value === null ? null : stringValue(observation, key)
}

function confidenceBand(confidence: number): AccomplishmentConfidenceBandV1 {
  if (confidence >= 0.8) return 'high'
  if (confidence >= 0.5) return 'medium'
  return 'low'
}

function sortedEvidence(
  evidence: readonly CapabilitySignalEvidenceFact[]
): CapabilitySignalEvidenceFact[] {
  return [...evidence].sort(
    (left, right) => left.id.localeCompare(right.id) || left.contentHash.localeCompare(right.contentHash)
  )
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort()
}

function sameMembers(left: readonly string[], right: readonly string[]): boolean {
  const orderedLeft = sortedUnique(left)
  const orderedRight = sortedUnique(right)
  return (
    left.length === orderedLeft.length &&
    right.length === orderedRight.length &&
    orderedLeft.length === orderedRight.length &&
    orderedLeft.every((value, index) => value === orderedRight[index])
  )
}

function levelCode(
  level: number,
  scale: readonly CapabilitySignalLevelScaleEntry[]
): string | null {
  return scale.find((entry) => entry.level === level)?.code ?? null
}

function scaleIsValid(scale: readonly CapabilitySignalLevelScaleEntry[]): boolean {
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

function deterministicUuid(hash: TvaSha256): string {
  const source = hash.slice('sha256:'.length, 'sha256:'.length + 32).split('')
  source[12] = '5'
  source[16] = '8'
  const hex = source.join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

function projectionForSource(
  input: CapabilitySignalProjectionInput,
  source: GovernedCapabilityObservationSource,
  hasher: AccomplishmentContentHasher,
  blockers: Set<CapabilitySignalProjectionCode>
): GovernedCapabilitySignalProjection | null {
  const { accomplishment } = input
  const { observation } = source
  if (!isReviewObservationV1(observation) || !isSha256(source.revisionHash)) {
    blockers.add(CAPABILITY_SIGNAL_PROJECTION_CODES.contractInvalid)
    return null
  }
  if (
    observation.observationType !== 'capability' ||
    observation.governanceState !== 'final' ||
    observation.finalizedAt === null ||
    observation.reviewerType !== 'human'
  ) {
    blockers.add(
      CAPABILITY_SIGNAL_PROJECTION_CODES.finalHumanGovernedObservationRequired
    )
  }
  if (!VERIFYING_DISPOSITIONS.has(observation.disposition)) {
    blockers.add(CAPABILITY_SIGNAL_PROJECTION_CODES.verifyingDispositionRequired)
  }
  if (
    observation.subjectUserId !== accomplishment.subjectUserId ||
    observation.taskAssignmentId !== accomplishment.taskAssignmentId ||
    observation.assignmentSnapshotId !== accomplishment.assignmentSnapshotId ||
    observation.sourceSnapshotHash !== accomplishment.assignmentSnapshotHash
  ) {
    blockers.add(CAPABILITY_SIGNAL_PROJECTION_CODES.provenanceMismatch)
  }
  if (observation.reviewPolicyVersion !== input.expectedReviewPolicyVersion) {
    blockers.add(CAPABILITY_SIGNAL_PROJECTION_CODES.policyMismatch)
  }
  if (observation.capabilityTaxonomyVersion !== input.expectedCapabilityTaxonomyVersion) {
    blockers.add(CAPABILITY_SIGNAL_PROJECTION_CODES.taxonomyMismatch)
  }

  const capabilityId = stringValue(observation, 'capabilityId')
  const taxonomyVersion = observation.capabilityTaxonomyVersion
  const observedBehaviour = stringValue(observation, 'observedBehaviour')
  const direction = stringValue(observation, 'direction')
  const applicability = stringValue(observation, 'applicability')
  const complexitySummary = nullableStringValue(observation, 'complexitySummary')
  const observedLevel = numberValue(observation, 'observedLevel')
  const confidence = observation.confidence
  if (
    capabilityId === null ||
    capabilityId !== observation.targetRef ||
    !isUuid(capabilityId) ||
    observedBehaviour === null ||
    direction === null ||
    !DIRECTIONS.has(direction) ||
    applicability === null ||
    !APPLICABILITIES.has(applicability) ||
    (observation.structuredValue['complexitySummary'] !== null && complexitySummary === null) ||
    confidence === null ||
    !Number.isFinite(confidence) ||
    confidence < 0 ||
    confidence > 1
  ) {
    blockers.add(CAPABILITY_SIGNAL_PROJECTION_CODES.capabilityDataInvalid)
  }

  const evidence = sortedEvidence(source.evidence)
  const evidenceIds = evidence.map(({ id }) => id)
  const governedEvidence = [...accomplishment.evidence].sort((left, right) =>
    left.id.localeCompare(right.id)
  )
  const governedEvidenceById = new Map(governedEvidence.map((fact) => [fact.id, fact]))
  if (
    evidence.some(({ id, contentHash }) => !isUuid(id) || !isSha256(contentHash)) ||
    governedEvidence.some(
      ({ id, contentHash }) => !isUuid(id) || (contentHash !== null && !isSha256(contentHash))
    ) ||
    new Set(governedEvidence.map(({ id }) => id)).size !== governedEvidence.length ||
    !sameMembers(
      governedEvidence.map(({ id }) => id),
      accomplishment.gate.allowed ? accomplishment.gate.evidenceIds : []
    ) ||
    !sameMembers(evidenceIds, observation.evidenceRefs) ||
    !evidenceIds.every((id) => accomplishment.gate.allowed && accomplishment.gate.evidenceIds.includes(id)) ||
    evidence.some((fact) => {
      const governed = governedEvidenceById.get(fact.id)
      return (
        !governed ||
        governed.contentHash === null ||
        governed.contentHash !== fact.contentHash ||
        governed.accessState !== fact.accessState
      )
    })
  ) {
    blockers.add(CAPABILITY_SIGNAL_PROJECTION_CODES.evidenceMismatch)
  }
  if (
    evidence.some(({ accessState }) => accessState !== 'available') ||
    evidenceIds.some((id) => governedEvidenceById.get(id)?.accessState !== 'available')
  ) {
    blockers.add(CAPABILITY_SIGNAL_PROJECTION_CODES.evidenceUnavailable)
  }

  const observationCeiling = observation.assessmentCeiling
  if (
    observationCeiling === null ||
    !Number.isSafeInteger(observationCeiling) ||
    !Number.isSafeInteger(source.authorizedAssessmentCeiling) ||
    observedLevel === null ||
    !Number.isSafeInteger(observedLevel)
  ) {
    blockers.add(CAPABILITY_SIGNAL_PROJECTION_CODES.assessmentScaleInvalid)
  }
  const effectiveCeiling = Math.min(
    observationCeiling ?? Number.NaN,
    source.authorizedAssessmentCeiling
  )
  const effectiveObservedLevel =
    observedLevel === null || !Number.isFinite(effectiveCeiling)
      ? null
      : Math.min(observedLevel, effectiveCeiling)
  const effectiveCeilingCode = levelCode(effectiveCeiling, input.levelScale)
  const effectiveObservedLevelCode =
    effectiveObservedLevel === null ? null : levelCode(effectiveObservedLevel, input.levelScale)
  const normalizedLevelScale = [...input.levelScale].sort(
    (left, right) => left.level - right.level || left.code.localeCompare(right.code)
  )
  if (effectiveCeilingCode === null || effectiveObservedLevelCode === null) {
    blockers.add(CAPABILITY_SIGNAL_PROJECTION_CODES.assessmentScaleInvalid)
  }

  if (
    blockers.size > 0 ||
    !accomplishment.gate.allowed ||
    capabilityId === null ||
    taxonomyVersion === null ||
    observedBehaviour === null ||
    direction === null ||
    applicability === null ||
    confidence === null ||
    observationCeiling === null ||
    observedLevel === null ||
    effectiveObservedLevel === null ||
    effectiveCeilingCode === null ||
    effectiveObservedLevelCode === null
  ) {
    return null
  }

  const provenance: CapabilitySignalProjectionProvenance = {
    accomplishment: {
      id: accomplishment.id,
      lifecycleState: accomplishment.gate.lifecycleState,
    },
    assignmentSnapshot: {
      id: accomplishment.assignmentSnapshotId,
      hash: accomplishment.assignmentSnapshotHash,
    },
    observation: {
      id: observation.id,
      revision: observation.reviewRevision,
      revisionHash: source.revisionHash,
      reviewWorkflowId: observation.reviewWorkflowId,
      reviewPolicyVersion: observation.reviewPolicyVersion,
      reviewerId: observation.reviewerId,
    },
    evidence,
    taxonomy: {
      capabilityId,
      version: taxonomyVersion,
    },
    context: {
      action: accomplishment.gate.action,
      object: accomplishment.gate.object,
      ownershipLevel: accomplishment.gate.ownershipLevel,
      complexitySummary,
    },
    assessment: {
      observedLevel,
      observationCeiling,
      authorizedCeiling: source.authorizedAssessmentCeiling,
      effectiveObservedLevel,
      effectiveCeiling,
      effectiveObservedLevelCode,
      effectiveCeilingCode,
      levelScale: normalizedLevelScale,
      confidence,
    },
    signalPolicyVersion: input.signalPolicyVersion,
  }
  const sourceHash = hasher.hash({
    schemaVersion: 'suar.capability_signal_projection_source.v1',
    provenance,
    observedBehaviour,
    direction,
    applicability,
  })
  const projectionKey = `acs:v1:${sourceHash.slice('sha256:'.length)}`
  try {
    const signal = parseAccomplishmentCapabilitySignalV1({
      contractVersion: 1,
      id: deterministicUuid(sourceHash),
      accomplishmentId: accomplishment.id,
      subjectUserId: accomplishment.subjectUserId,
      capabilityId,
      observedBehaviour,
      observedLevelCode: effectiveObservedLevelCode,
      assessmentCeilingCode: effectiveCeilingCode,
      direction,
      applicability,
      context: provenance.context,
      evidenceReferences: evidenceIds,
      reviewObservationIds: [observation.id],
      confidenceScore: confidence,
      confidenceBand: confidenceBand(confidence),
      signalState: 'active',
      policyVersion: input.signalPolicyVersion,
      observedAt: observation.finalizedAt,
    })
    return { projectionKey, sourceHash, signal, provenance }
  } catch {
    blockers.add(CAPABILITY_SIGNAL_PROJECTION_CODES.contractInvalid)
    return null
  }
}

export function projectGovernedCapabilitySignals(
  input: CapabilitySignalProjectionInput,
  hasher: AccomplishmentContentHasher
): CapabilitySignalProjectionResult {
  const blockers = new Set<CapabilitySignalProjectionCode>()
  if (!input.accomplishment.gate.allowed) {
    blockers.add(CAPABILITY_SIGNAL_PROJECTION_CODES.accomplishmentGateNotPassed)
  }
  if (
    !isUuid(input.accomplishment.id) ||
    !isUuid(input.accomplishment.subjectUserId) ||
    !isUuid(input.accomplishment.taskAssignmentId) ||
    !isUuid(input.accomplishment.assignmentSnapshotId) ||
    !isSha256(input.accomplishment.assignmentSnapshotHash) ||
    !input.signalPolicyVersion.trim() ||
    !input.expectedReviewPolicyVersion.trim() ||
    !input.expectedCapabilityTaxonomyVersion.trim() ||
    input.observations.length === 0
  ) {
    blockers.add(CAPABILITY_SIGNAL_PROJECTION_CODES.contractInvalid)
  }
  if (!scaleIsValid(input.levelScale)) {
    blockers.add(CAPABILITY_SIGNAL_PROJECTION_CODES.assessmentScaleInvalid)
  }
  const observationIds = input.observations.map(({ observation }) => observation.id)
  if (new Set(observationIds).size !== observationIds.length) {
    blockers.add(CAPABILITY_SIGNAL_PROJECTION_CODES.duplicateSource)
  }

  const projected = input.observations
    .map((source) => projectionForSource(input, source, hasher, blockers))
    .filter((value): value is GovernedCapabilitySignalProjection => value !== null)
    .sort((left, right) => left.projectionKey.localeCompare(right.projectionKey))

  if (blockers.size > 0 || projected.length !== input.observations.length) {
    return { allowed: false, blockerCodes: [...blockers].sort() }
  }
  return { allowed: true, blockerCodes: [], signals: projected }
}
