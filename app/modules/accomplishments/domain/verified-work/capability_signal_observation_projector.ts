import {
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
  sortedEvidence,
  stringValue,
  VERIFYING_DISPOSITIONS,
  type CapabilitySignalProjectionCode,
  type CapabilitySignalProjectionInput,
  type CapabilitySignalProjectionProvenance,
  type GovernedCapabilityObservationSource,
  type GovernedCapabilitySignalProjection,
} from './capability_signal_projection_types.js'

import type { AccomplishmentContentHasher } from '#modules/accomplishments/domain/verified-work/accomplishment_projection_identity'
import { parseAccomplishmentCapabilitySignalV1 } from '#modules/accomplishments/public_contracts/verified-work/accomplishment_capability_signal_v1'
import { isReviewObservationV1 } from '#modules/tasks/public_contracts/task-authoring/validators'

export function projectionForSource(
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
    blockers.add(CAPABILITY_SIGNAL_PROJECTION_CODES.finalHumanGovernedObservationRequired)
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
    !evidenceIds.every(
      (id) => accomplishment.gate.allowed && accomplishment.gate.evidenceIds.includes(id)
    ) ||
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
