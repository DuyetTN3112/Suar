import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type {
  AccomplishmentLifecycleGovernanceWriter,
  GovernAccomplishmentLifecycleInput,
  PersistedAccomplishmentLifecycleTransition,
} from '#modules/accomplishments/actions/ports/outbound/lifecycle/accomplishment_lifecycle_governance_writer'
import { validateAccomplishmentLifecycleTransition } from '#modules/accomplishments/domain/lifecycle/accomplishment_lifecycle_rules'
import {
  deterministicUuidFromSha256,
  hashVerifiedAccomplishmentPayload,
  type AccomplishmentContentHasher,
} from '#modules/accomplishments/domain/verified-work/accomplishment_projection_identity'
import { NodeAccomplishmentContentHasher } from '#modules/accomplishments/infra/adapters/verified-work/node_accomplishment_content_hasher'
import { parseAccomplishmentCapabilitySignalV1 } from '#modules/accomplishments/public_contracts/verified-work/accomplishment_capability_signal_v1'
import type {
  AccomplishmentLifecycleStateV1,
  AccomplishmentVisibilityV1,
} from '#modules/accomplishments/public_contracts/verified-work/accomplishment_contract_primitives_v1'
import {
  parseAccomplishmentLifecycleRevisionV1,
  type AccomplishmentLifecycleRevisionV1,
} from '#modules/accomplishments/public_contracts/lifecycle/accomplishment_lifecycle_v1'
import {
  parseVerifiedWorkAccomplishmentV1,
  type VerifiedWorkAccomplishmentV1,
} from '#modules/accomplishments/public_contracts/verified-work/verified_work_accomplishment_v1'
import type { TvaSha256 } from '#modules/tasks/public_contracts/task-authoring/primitives'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'

const ACCOMPLISHMENT_TABLE = 'verified_work_accomplishments'
const LIFECYCLE_TABLE = 'accomplishment_lifecycle_revisions'
const SIGNAL_TABLE = 'accomplishment_capability_signals'
const PUBLIC_PROJECTION_TABLE = 'accomplishment_public_projections'
const LOCK_TIMEOUT = '5000ms'

interface AccomplishmentRow {
  id: string
  user_id: string
  task_assignment_id: string
  lifecycle_state: AccomplishmentLifecycleStateV1
  visibility: AccomplishmentVisibilityV1
  canonical_hash: string
  canonical_payload: unknown
}

interface LifecycleRow {
  id: string
  accomplishment_id: string
  sequence: number | string
  previous_state: AccomplishmentLifecycleStateV1 | null
  next_state: AccomplishmentLifecycleStateV1
  visibility: AccomplishmentVisibilityV1
  reason_code: AccomplishmentLifecycleRevisionV1['reasonCode']
  source_fact_id: string
  source_fact_type: AccomplishmentLifecycleRevisionV1['sourceFact']['type']
  source_fact_hash: string
  actor_type: AccomplishmentLifecycleRevisionV1['actor']['type']
  actor_user_id: string | null
  policy_version: string
  supersedes_revision_id: string | null
  related_accomplishment_id: string | null
  revision_payload: unknown
}

interface SignalRow {
  id: string
  signal_state: 'active' | 'frozen' | 'superseded' | 'revoked'
  signal_payload: unknown
}

interface CorrectionTargetRow {
  id: string
  user_id: string
  task_assignment_id: string
  lifecycle_state: AccomplishmentLifecycleStateV1
}

export class AccomplishmentLifecycleSourceCollisionException extends ConflictException {
  constructor(accomplishmentId: string, sourceFactId: string) {
    super('Accomplishment lifecycle source fact was already used with different content', {
      accomplishmentId,
      sourceFactId,
    })
  }
}

export class AccomplishmentLifecycleTransitionConflictException extends ConflictException {
  constructor(accomplishmentId: string) {
    super('Accomplishment lifecycle head changed before this transition could be applied', {
      accomplishmentId,
    })
  }
}

export class AccomplishmentLifecycleCorrectionTargetException extends BusinessLogicException {
  constructor(accomplishmentId: string, relatedAccomplishmentId: string | null) {
    super('Accomplishment correction must point to an existing governed successor', {
      accomplishmentId,
      relatedAccomplishmentId,
    })
  }
}

function asSequence(value: number | string, accomplishmentId: string): number {
  const sequence = Number(value)
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new PersistedDataIntegrityException('Accomplishment lifecycle sequence is corrupt', {
      accomplishmentId,
    })
  }
  return sequence
}

function asTimestamp(value: string, field: string): Date {
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) {
    throw new BusinessLogicException(`Accomplishment lifecycle ${field} is invalid`)
  }
  return timestamp
}

function setEquals(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length &&
    [...left].sort().every((value, index) => value === [...right].sort()[index])
  )
}

function revisionIdentity(
  input: GovernAccomplishmentLifecycleInput,
  hasher: AccomplishmentContentHasher
): string {
  return deterministicUuidFromSha256(
    hasher.hash({
      schemaVersion: 'suar.accomplishment_lifecycle_transition_identity.v1',
      accomplishmentId: input.accomplishmentId,
      sourceFactType: input.sourceFact.type,
      sourceFactId: input.sourceFact.id,
    })
  )
}

function expectedRevision(
  input: GovernAccomplishmentLifecycleInput,
  hasher: AccomplishmentContentHasher
): AccomplishmentLifecycleRevisionV1 {
  return parseAccomplishmentLifecycleRevisionV1({
    contractVersion: 1,
    id: revisionIdentity(input, hasher),
    accomplishmentId: input.accomplishmentId,
    sequence: input.expectedLifecycleSequence + 1,
    previousState: input.expectedLifecycleState,
    nextState: input.nextLifecycleState,
    visibility: input.nextVisibility,
    reasonCode: input.reasonCode,
    sourceFact: input.sourceFact,
    actor: input.actor,
    policyVersion: input.policyVersion,
    supersedesRevisionId:
      input.nextLifecycleState === 'superseded' ? input.expectedLifecycleRevisionId : null,
    relatedAccomplishmentId: input.relatedAccomplishmentId,
    occurredAt: input.occurredAt,
  })
}

function parseLifecycleRow(row: LifecycleRow): AccomplishmentLifecycleRevisionV1 {
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

function parseAggregate(
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

async function loadLifecycleHead(
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

function assertHeadMatchesAggregate(
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

function assertGovernedSemantics(input: GovernAccomplishmentLifecycleInput): void {
  const sourceTypeAllowed =
    (input.reasonCode === 'dispute_opened' && input.sourceFact.type === 'dispute') ||
    (input.reasonCode === 'dispute_resolved' && input.sourceFact.type === 'dispute') ||
    (input.reasonCode === 'correction_issued' && input.sourceFact.type === 'correction') ||
    (input.reasonCode === 'superseded' &&
      ['correction', 'governance'].includes(input.sourceFact.type)) ||
    (input.reasonCode === 'governance_revoked' && input.sourceFact.type === 'governance') ||
    (input.reasonCode === 'publication_changed' && input.sourceFact.type === 'publication') ||
    ['candidate_created', 'review_started', 'verification_completed', 'partial_verification_completed'].includes(
      input.reasonCode
    )
  const governanceRequired = [
    'dispute_resolved',
    'correction_issued',
    'superseded',
    'governance_revoked',
  ].includes(input.reasonCode)
  if (!sourceTypeAllowed || (governanceRequired && input.actor.type !== 'governance')) {
    throw new BusinessLogicException('Accomplishment lifecycle transition lacks governed provenance')
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

async function assertCorrectionTarget(
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

async function loadAndValidateSignals(
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

function signalStateFor(
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

async function updateSignals(
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

function transitionedAggregate(
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

function result(
  inserted: boolean,
  revision: AccomplishmentLifecycleRevisionV1,
  current: VerifiedWorkAccomplishmentV1
): PersistedAccomplishmentLifecycleTransition {
  return {
    inserted,
    revision,
    currentLifecycleState: current.lifecycleState,
    currentVisibility: current.visibility,
    currentCanonicalHash: current.canonicalHash as TvaSha256,
  }
}

export class LucidAccomplishmentLifecycleGovernanceRepository
  implements AccomplishmentLifecycleGovernanceWriter
{
  constructor(
    private readonly hasher: AccomplishmentContentHasher = new NodeAccomplishmentContentHasher()
  ) {}

  async transition(
    input: GovernAccomplishmentLifecycleInput
  ): Promise<PersistedAccomplishmentLifecycleTransition> {
    const requestedRevision = expectedRevision(input, this.hasher)
    const lockIds = [...new Set([input.accomplishmentId, input.relatedAccomplishmentId].filter(
      (value): value is string => value !== null
    ))].sort()

    return db.transaction(async (trx) => {
      await trx.rawQuery("SELECT set_config('lock_timeout', ?, true)", [LOCK_TIMEOUT])
      for (const accomplishmentId of lockIds) {
        await trx.rawQuery('SELECT pg_advisory_xact_lock(hashtextextended(?, 0))', [
          `accomplishment-lifecycle:${accomplishmentId}`,
        ])
      }

      const row = (await trx
        .from(ACCOMPLISHMENT_TABLE)
        .where('id', input.accomplishmentId)
        .forUpdate()
        .first()) as AccomplishmentRow | undefined
      if (!row) throw NotFoundException.resource('Verified accomplishment', input.accomplishmentId)

      const current = parseAggregate(row, this.hasher)
      const head = await loadLifecycleHead(trx, input.accomplishmentId)
      assertHeadMatchesAggregate(current, head.revision)

      const replayRow = (await trx
        .from(LIFECYCLE_TABLE)
        .where({
          accomplishment_id: input.accomplishmentId,
          source_fact_type: input.sourceFact.type,
          source_fact_id: input.sourceFact.id,
        })
        .first()) as LifecycleRow | undefined
      if (replayRow) {
        const replay = parseLifecycleRow(replayRow)
        if (this.hasher.hash(replay) !== this.hasher.hash(requestedRevision)) {
          throw new AccomplishmentLifecycleSourceCollisionException(
            input.accomplishmentId,
            input.sourceFact.id
          )
        }
        return result(false, replay, current)
      }

      const revisionIdCollision = (await trx
        .from(LIFECYCLE_TABLE)
        .where('id', requestedRevision.id)
        .first()) as { id: string } | undefined
      if (revisionIdCollision) {
        throw new AccomplishmentLifecycleSourceCollisionException(
          input.accomplishmentId,
          input.sourceFact.id
        )
      }

      if (
        head.revision.id !== input.expectedLifecycleRevisionId ||
        head.revision.sequence !== input.expectedLifecycleSequence ||
        current.lifecycleState !== input.expectedLifecycleState ||
        current.visibility !== input.expectedVisibility
      ) {
        throw new AccomplishmentLifecycleTransitionConflictException(input.accomplishmentId)
      }

      assertGovernedSemantics(input)
      const validation = validateAccomplishmentLifecycleTransition({
        previousState: current.lifecycleState,
        nextState: requestedRevision.nextState,
        previousVisibility: current.visibility,
        nextVisibility: requestedRevision.visibility,
        reasonCode: requestedRevision.reasonCode,
      })
      if (!validation.allowed) {
        throw new BusinessLogicException('Accomplishment lifecycle transition is not allowed', {
          reasonCodes: validation.blockerCodes,
        })
      }
      if (
        current.lifecycleState === 'frozen' &&
        requestedRevision.reasonCode === 'dispute_resolved' &&
        requestedRevision.nextState !== head.revision.previousState
      ) {
        throw new BusinessLogicException(
          'Dispute resolution must restore the exact pre-dispute accomplishment state'
        )
      }
      if (
        asTimestamp(requestedRevision.occurredAt, 'occurredAt').getTime() <
        asTimestamp(head.revision.occurredAt, 'head occurredAt').getTime()
      ) {
        throw new AccomplishmentLifecycleTransitionConflictException(input.accomplishmentId)
      }

      await assertCorrectionTarget(trx, current, requestedRevision.relatedAccomplishmentId)
      const signals = await loadAndValidateSignals(trx, current)
      const transitioned = transitionedAggregate(current, requestedRevision, this.hasher)

      await trx.table(LIFECYCLE_TABLE).insert({
        id: requestedRevision.id,
        contract_version: requestedRevision.contractVersion,
        schema_version: 'suar.accomplishment_lifecycle_revision.v1',
        accomplishment_id: requestedRevision.accomplishmentId,
        sequence: requestedRevision.sequence,
        previous_state: requestedRevision.previousState,
        next_state: requestedRevision.nextState,
        visibility: requestedRevision.visibility,
        reason_code: requestedRevision.reasonCode,
        source_fact_id: requestedRevision.sourceFact.id,
        source_fact_type: requestedRevision.sourceFact.type,
        source_fact_hash: requestedRevision.sourceFact.hash,
        actor_type: requestedRevision.actor.type,
        actor_user_id: requestedRevision.actor.userId,
        policy_version: requestedRevision.policyVersion,
        supersedes_revision_id: requestedRevision.supersedesRevisionId,
        related_accomplishment_id: requestedRevision.relatedAccomplishmentId,
        revision_payload: JSON.stringify(requestedRevision),
        occurred_at: asTimestamp(requestedRevision.occurredAt, 'occurredAt'),
        created_at: asTimestamp(requestedRevision.occurredAt, 'occurredAt'),
      })
      await updateSignals(trx, signals, signalStateFor(requestedRevision))

      if (
        ['frozen', 'superseded', 'revoked'].includes(requestedRevision.nextState) ||
        requestedRevision.visibility !== 'public'
      ) {
        await trx
          .from(PUBLIC_PROJECTION_TABLE)
          .where('accomplishment_id', current.id)
          .whereNull('retired_at')
          .update({ retired_at: asTimestamp(requestedRevision.occurredAt, 'occurredAt') })
      }

      await trx
        .from(ACCOMPLISHMENT_TABLE)
        .where('id', current.id)
        .update({
          lifecycle_state: transitioned.lifecycleState,
          visibility: transitioned.visibility,
          canonical_hash: transitioned.canonicalHash,
          canonical_payload: JSON.stringify(transitioned),
          updated_at: asTimestamp(transitioned.updatedAt, 'updatedAt'),
        })

      return result(true, requestedRevision, transitioned)
    })
  }
}

export const lucidAccomplishmentLifecycleGovernanceRepository =
  new LucidAccomplishmentLifecycleGovernanceRepository()
