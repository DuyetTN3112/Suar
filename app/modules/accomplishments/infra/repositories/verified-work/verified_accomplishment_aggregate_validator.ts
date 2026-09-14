import { setEquals } from './verified_accomplishment_types.js'

import type { CreateVerifiedAccomplishmentAggregateInput } from '#modules/accomplishments/actions/ports/outbound/verified-work/verified_accomplishment_writer'
import { validateAccomplishmentLifecycleTransition } from '#modules/accomplishments/domain/lifecycle/accomplishment_lifecycle_rules'
import {
  hashVerifiedAccomplishmentPayload,
  type AccomplishmentContentHasher,
} from '#modules/accomplishments/domain/verified-work/accomplishment_projection_identity'
import {
  parseAccomplishmentLifecycleRevisionV1,
  type AccomplishmentLifecycleRevisionV1,
} from '#modules/accomplishments/public_contracts/lifecycle/accomplishment_lifecycle_v1'
import { parseAccomplishmentCapabilitySignalV1 } from '#modules/accomplishments/public_contracts/verified-work/accomplishment_capability_signal_v1'
import {
  parseVerifiedWorkAccomplishmentV1,
  type VerifiedWorkAccomplishmentV1,
} from '#modules/accomplishments/public_contracts/verified-work/verified_work_accomplishment_v1'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import { isCompletionClaimV1 } from '#modules/tasks/public_contracts/task-authoring/validators'

export function assertAggregateInput(
  input: CreateVerifiedAccomplishmentAggregateInput,
  hasher: AccomplishmentContentHasher
): {
  accomplishment: VerifiedWorkAccomplishmentV1
  lifecycle: AccomplishmentLifecycleRevisionV1[]
} {
  const accomplishment = parseVerifiedWorkAccomplishmentV1(input.accomplishment)
  if (!input.projectionKey.trim() || input.projectionKey.length > 255) {
    throw new InvariantViolationException('Verified accomplishment projection key is invalid')
  }
  if (!['verified', 'partially_verified'].includes(accomplishment.lifecycleState)) {
    throw new InvariantViolationException(
      'Verified accomplishment writer only accepts governed verified output'
    )
  }
  const computedHash = hashVerifiedAccomplishmentPayload(accomplishment, hasher)
  if (computedHash !== accomplishment.canonicalHash) {
    throw new InvariantViolationException(
      'Verified accomplishment canonical hash does not match its canonical payload'
    )
  }

  const claimIds = input.claimLinks.map(({ claim }) => claim.id)
  if (
    new Set(claimIds).size !== claimIds.length ||
    !setEquals(claimIds, accomplishment.provenance.completionClaimIds)
  ) {
    throw new InvariantViolationException(
      'Verified accomplishment claim links must exactly match canonical provenance'
    )
  }
  for (const link of input.claimLinks) {
    if (
      !isCompletionClaimV1(link.claim) ||
      link.claim.userId !== accomplishment.userId ||
      link.claim.completionReportId !== accomplishment.provenance.completionReportId ||
      link.claim.assignmentSnapshotId !== accomplishment.provenance.assignmentSnapshotId ||
      link.projectedOwnershipLevel !== accomplishment.ownershipLevel ||
      (link.projectedClaimStatus === 'verified') !==
        (accomplishment.lifecycleState === 'verified')
    ) {
      throw new InvariantViolationException(
        'Verified accomplishment claim link crosses its canonical boundary'
      )
    }
  }

  const evidenceIds = input.evidenceLinks.map(({ evidenceId }) => evidenceId)
  if (
    new Set(evidenceIds).size !== evidenceIds.length ||
    !setEquals(
      evidenceIds,
      accomplishment.evidenceReferences.map(({ evidenceId }) => evidenceId)
    ) ||
    input.evidenceLinks.some(
      ({ completionClaimId }) => completionClaimId !== null && !claimIds.includes(completionClaimId)
    )
  ) {
    throw new InvariantViolationException(
      'Verified accomplishment evidence links cross the claim or canonical boundary'
    )
  }
  for (const link of input.evidenceLinks) {
    const canonical = accomplishment.evidenceReferences.find(
      ({ evidenceId }) => evidenceId === link.evidenceId
    )
    if (
      !canonical ||
      canonical.evidenceType !== link.evidenceType ||
      canonical.accessClassification !== link.accessClassification ||
      canonical.availability !== link.availability ||
      canonical.contentHash !== link.contentHash
    ) {
      throw new InvariantViolationException(
        'Verified accomplishment evidence metadata contradicts canonical provenance'
      )
    }
  }

  const observationIds = input.reviewObservationLinks.map(({ reviewObservationId }) =>
    reviewObservationId
  )
  if (
    new Set(observationIds).size !== observationIds.length ||
    !setEquals(observationIds, accomplishment.provenance.reviewObservationIds)
  ) {
    throw new InvariantViolationException(
      'Verified accomplishment observation links must exactly match canonical provenance'
    )
  }

  const signalIds = input.capabilitySignals.map(({ signal }) => signal.id)
  if (
    new Set(signalIds).size !== signalIds.length ||
    !setEquals(signalIds, accomplishment.capabilitySignalIds)
  ) {
    throw new InvariantViolationException(
      'Verified accomplishment capability signals must exactly match canonical references'
    )
  }
  for (const inputSignal of input.capabilitySignals) {
    const signal = parseAccomplishmentCapabilitySignalV1(inputSignal.signal)
    const linkedObservationHashes = signal.reviewObservationIds.map((observationId) =>
      input.reviewObservationLinks.find(
        ({ reviewObservationId }) => reviewObservationId === observationId
      )?.sourceObservationHash
    )
    if (
      signal.accomplishmentId !== accomplishment.id ||
      signal.subjectUserId !== accomplishment.userId ||
      signal.context.action !== accomplishment.action ||
      signal.context.object !== accomplishment.object ||
      signal.context.ownershipLevel !== accomplishment.ownershipLevel ||
      signal.signalState !== 'active' ||
      !signal.reviewObservationIds.every((id) => observationIds.includes(id)) ||
      !signal.evidenceReferences.every((id) => evidenceIds.includes(id)) ||
      linkedObservationHashes.some((hash) => hash !== inputSignal.sourceObservationHash)
    ) {
      throw new InvariantViolationException(
        'Verified accomplishment capability signal crosses its source boundary'
      )
    }
  }

  const lifecycle = input.lifecycleRevisions
    .map((revision) => parseAccomplishmentLifecycleRevisionV1(revision))
    .sort((left, right) => left.sequence - right.sequence)
  if (lifecycle.length === 0) {
    throw new InvariantViolationException(
      'Verified accomplishment requires an immutable lifecycle history'
    )
  }
  for (let index = 0; index < lifecycle.length; index += 1) {
    const revision = lifecycle[index]
    const previous = index === 0 ? null : lifecycle[index - 1]
    if (
      !revision ||
      revision.accomplishmentId !== accomplishment.id ||
      revision.sequence !== index + 1 ||
      revision.previousState !== (previous?.nextState ?? null) ||
      !validateAccomplishmentLifecycleTransition({
        previousState: revision.previousState,
        nextState: revision.nextState,
        previousVisibility: previous?.visibility ?? null,
        nextVisibility: revision.visibility,
        reasonCode: revision.reasonCode,
      }).allowed
    ) {
      throw new InvariantViolationException(
        'Verified accomplishment lifecycle history is not continuous or governed'
      )
    }
  }
  const finalRevision = lifecycle.at(-1)
  if (
    !finalRevision ||
    finalRevision.nextState !== accomplishment.lifecycleState ||
    finalRevision.visibility !== accomplishment.visibility
  ) {
    throw new InvariantViolationException(
      'Verified accomplishment lifecycle head does not match its canonical payload'
    )
  }
  return { accomplishment, lifecycle }
}
