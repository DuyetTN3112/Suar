import { projectionForSource } from './capability_signal_observation_projector.js'
import {
  CAPABILITY_SIGNAL_PROJECTION_CODES,
  isSha256,
  isUuid,
  scaleIsValid,
  type CapabilitySignalProjectionCode,
  type CapabilitySignalProjectionInput,
  type CapabilitySignalProjectionResult,
  type GovernedCapabilitySignalProjection,
} from './capability_signal_projection_types.js'

import type { AccomplishmentContentHasher } from '#modules/accomplishments/domain/verified-work/accomplishment_projection_identity'

export {
  APPLICABILITIES,
  CAPABILITY_SIGNAL_PROJECTION_CODES,
  confidenceBand,
  deterministicUuid,
  DIRECTIONS,
  isSha256,
  isUuid,
  levelCode,
  nullableStringValue,
  numberValue,
  sameMembers,
  scaleIsValid,
  SHA256_PATTERN,
  sortedEvidence,
  sortedUnique,
  stringValue,
  UUID_PATTERN,
  VERIFYING_DISPOSITIONS,
  type CapabilityEvidenceAccessState,
  type CapabilityEvidenceVerificationStrength,
  type CapabilitySignalAccomplishmentBoundary,
  type CapabilitySignalEvidenceFact,
  type CapabilitySignalLevelScaleEntry,
  type CapabilitySignalProjectionBlocked,
  type CapabilitySignalProjectionCode,
  type CapabilitySignalProjectionInput,
  type CapabilitySignalProjectionPassed,
  type CapabilitySignalProjectionProvenance,
  type CapabilitySignalProjectionResult,
  type GovernedCapabilityEvidenceBoundaryFact,
  type GovernedCapabilityObservationSource,
  type GovernedCapabilitySignalProjection,
} from './capability_signal_projection_types.js'

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
