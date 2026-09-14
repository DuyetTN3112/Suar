import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  ACCOMPLISHMENT_TABLE,
  AccomplishmentLifecycleCorrectionTargetException,
  asSequence,
  LIFECYCLE_TABLE,
  setEquals,
  SIGNAL_TABLE,
  type AccomplishmentRow,
  type CorrectionTargetRow,
  type LifecycleRow,
  type SignalRow,
} from './lucid_accomplishment_lifecycle_types.js'

import type { GovernAccomplishmentLifecycleInput } from '#modules/accomplishments/actions/ports/outbound/lifecycle/accomplishment_lifecycle_governance_writer'
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
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'

export function parseLifecycleRow(row: LifecycleRow): AccomplishmentLifecycleRevisionV1 {
  const revision = parseAccomplishmentLifecycleRevisionV1(row.revision_payload)
  const sequence = asSequence(row.sequence, row.accomplishment_id)
  if (
    revision.id !== row.id ||
    revision.accomplishmentId !== row.accomplishment_id ||
    revision.sequence !== sequence ||
    revision.previousState !== row.previous_state ||
    revision.nextState !== row.next_state ||
    revision.visibility !== row.visibility ||
    revision.reasonCode !== row.reason_code ||
    revision.sourceFact.id !== row.source_fact_id ||
    revision.sourceFact.type !== row.source_fact_type ||
    revision.sourceFact.hash !== row.source_fact_hash ||
    revision.actor.type !== row.actor_type ||
    revision.actor.userId !== row.actor_user_id ||
    revision.policyVersion !== row.policy_version ||
    revision.supersedesRevisionId !== row.supersedes_revision_id ||
    revision.relatedAccomplishmentId !== row.related_accomplishment_id
  ) {
    throw new PersistedDataIntegrityException(
      'Accomplishment lifecycle row does not match its immutable payload',
      { accomplishmentId: row.accomplishment_id, lifecycleRevisionId: row.id }
    )
  }
  return revision
}

export function parseAggregate(
  row: AccomplishmentRow,
  hasher: AccomplishmentContentHasher
): VerifiedWorkAccomplishmentV1 {
  const accomplishment = parseVerifiedWorkAccomplishmentV1(row.canonical_payload)
  if (
    accomplishment.id !== row.id ||
    accomplishment.userId !== row.user_id ||
    accomplishment.taskAssignmentId !== row.task_assignment_id ||
    accomplishment.lifecycleState !== row.lifecycle_state ||
    accomplishment.visibility !== row.visibility ||
    accomplishment.canonicalHash !== row.canonical_hash ||
    hashVerifiedAccomplishmentPayload(accomplishment, hasher) !== row.canonical_hash
  ) {
    throw new PersistedDataIntegrityException(
      'Accomplishment aggregate does not match its canonical payload and hash',
      { accomplishmentId: row.id }
    )
  }
  return accomplishment
}

export async function loadLifecycleHead(
  trx: TransactionClientContract,
  accomplishmentId: string
): Promise<{ row: LifecycleRow; revision: AccomplishmentLifecycleRevisionV1 }> {
  const row = (await trx
    .from(LIFECYCLE_TABLE)
    .where('accomplishment_id', accomplishmentId)
    .orderBy('sequence', 'desc')
    .first()) as LifecycleRow | undefined
  if (!row) {
    throw new PersistedDataIntegrityException(
      'Accomplishment aggregate does not resolve to a lifecycle head',
      { accomplishmentId }
    )
  }
  return { row, revision: parseLifecycleRow(row) }
}

export function assertHeadMatchesAggregate(
  accomplishment: VerifiedWorkAccomplishmentV1,
  head: AccomplishmentLifecycleRevisionV1
): void {
  if (
    head.nextState !== accomplishment.lifecycleState ||
    head.visibility !== accomplishment.visibility
  ) {
    throw new PersistedDataIntegrityException(
      'Accomplishment lifecycle head does not match its canonical aggregate',
      { accomplishmentId: accomplishment.id, lifecycleRevisionId: head.id }
    )
  }
}

export function assertGovernedSemantics(input: GovernAccomplishmentLifecycleInput): void {
  const sourceTypeAllowed =
    (input.reasonCode === 'dispute_opened' && input.sourceFact.type === 'dispute') ||
    (input.reasonCode === 'dispute_resolved' && input.sourceFact.type === 'dispute') ||
    (input.reasonCode === 'correction_issued' && input.sourceFact.type === 'correction') ||
    (input.reasonCode === 'superseded' &&
      ['correction', 'governance'].includes(input.sourceFact.type)) ||
    (input.reasonCode === 'governance_revoked' && input.sourceFact.type === 'governance') ||
    (input.reasonCode === 'publication_changed' && input.sourceFact.type === 'publication') ||
    [
      'candidate_created',
      'review_started',
      'verification_completed',
      'partial_verification_completed',
    ].includes(input.reasonCode)
  const governanceRequired = [
    'dispute_resolved',
    'correction_issued',
    'superseded',
    'governance_revoked',
  ].includes(input.reasonCode)
  if (!sourceTypeAllowed || (governanceRequired && input.actor.type !== 'governance')) {
    throw new BusinessLogicException(
      'Accomplishment lifecycle transition lacks governed provenance'
    )
  }
  if (
    (input.nextLifecycleState === 'superseded' && input.relatedAccomplishmentId === null) ||
    (input.nextLifecycleState !== 'superseded' && input.relatedAccomplishmentId !== null)
  ) {
    throw new AccomplishmentLifecycleCorrectionTargetException(
      input.accomplishmentId,
      input.relatedAccomplishmentId
    )
  }
}

export async function assertCorrectionTarget(
  trx: TransactionClientContract,
  accomplishment: VerifiedWorkAccomplishmentV1,
  relatedAccomplishmentId: string | null
): Promise<void> {
  if (relatedAccomplishmentId === null) return
  const target = (await trx
    .from(ACCOMPLISHMENT_TABLE)
    .where('id', relatedAccomplishmentId)
    .forShare()
    .first()) as CorrectionTargetRow | undefined
  if (
    !target ||
    target.id === accomplishment.id ||
    target.user_id !== accomplishment.userId ||
    target.task_assignment_id !== accomplishment.taskAssignmentId ||
    !['verified', 'partially_verified'].includes(target.lifecycle_state)
  ) {
    throw new AccomplishmentLifecycleCorrectionTargetException(
      accomplishment.id,
      relatedAccomplishmentId
    )
  }
}

export async function loadAndValidateSignals(
  trx: TransactionClientContract,
  accomplishment: VerifiedWorkAccomplishmentV1
): Promise<SignalRow[]> {
  const rows = (await trx
    .from(SIGNAL_TABLE)
    .where('accomplishment_id', accomplishment.id)
    .select(['id', 'signal_state', 'signal_payload'])
    .forUpdate()) as SignalRow[]
  if (!setEquals(rows.map(({ id }) => id), accomplishment.capabilitySignalIds)) {
    throw new PersistedDataIntegrityException(
      'Accomplishment capability signal set does not match canonical references',
      { accomplishmentId: accomplishment.id }
    )
  }
  for (const row of rows) {
    const payload = parseAccomplishmentCapabilitySignalV1(row.signal_payload)
    if (
      payload.id !== row.id ||
      payload.accomplishmentId !== accomplishment.id ||
      payload.signalState !== row.signal_state
    ) {
      throw new PersistedDataIntegrityException(
        'Accomplishment capability signal row does not match its canonical payload',
        { accomplishmentId: accomplishment.id, capabilitySignalId: row.id }
      )
    }
  }
  return rows
}

export function signalStateFor(
  revision: AccomplishmentLifecycleRevisionV1
): SignalRow['signal_state'] | null {
  switch (revision.nextState) {
    case 'frozen':
      return 'frozen'
    case 'verified':
    case 'partially_verified':
      return revision.reasonCode === 'dispute_resolved' ? 'active' : null
    case 'superseded':
      return 'superseded'
    case 'revoked':
      return 'revoked'
    case 'candidate':
    case 'under_review':
      return null
  }
}

export async function updateSignals(
  trx: TransactionClientContract,
  rows: readonly SignalRow[],
  nextState: SignalRow['signal_state'] | null
): Promise<void> {
  if (nextState === null) return
  for (const row of rows) {
    const payload = parseAccomplishmentCapabilitySignalV1(row.signal_payload)
    const nextPayload = parseAccomplishmentCapabilitySignalV1({
      ...payload,
      signalState: nextState,
    })
    await trx
      .from(SIGNAL_TABLE)
      .where('id', row.id)
      .update({ signal_state: nextState, signal_payload: JSON.stringify(nextPayload) })
  }
}

export function transitionedAggregate(
  current: VerifiedWorkAccomplishmentV1,
  revision: AccomplishmentLifecycleRevisionV1,
  hasher: AccomplishmentContentHasher
): VerifiedWorkAccomplishmentV1 {
  const withoutUpdatedHash: VerifiedWorkAccomplishmentV1 = {
    ...current,
    lifecycleState: revision.nextState,
    visibility: revision.visibility,
    updatedAt: revision.occurredAt,
  }
  return parseVerifiedWorkAccomplishmentV1({
    ...withoutUpdatedHash,
    canonicalHash: hashVerifiedAccomplishmentPayload(withoutUpdatedHash, hasher),
  })
}
