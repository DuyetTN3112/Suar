import { isDeepStrictEqual } from 'node:util'

import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DateTime } from 'luxon'

import {
  ACTIVE_REVIEW_DISPUTE_STATUSES,
  assertGovernedSuccessorPersistenceAllowed,
  assertResolvedReadinessHistoryIntegrity,
  findGovernedAssignmentLifecycle,
  type GovernedAssignmentLifecycle,
} from './task_assignment_governed_lifecycle_invariants.js'

import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type {
  PersistTaskAssignmentContractSnapshotInput,
  TaskAssignmentAcknowledgementState,
  TaskAssignmentContractSnapshotRecord,
} from '#modules/tasks/actions/ports/outbound/task_assignment_contract_repository'
import type { TaskContractContentHasher } from '#modules/tasks/actions/ports/outbound/task_contract_content_hasher'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { CanonicalTaskAssignmentContractSnapshotV1 } from '#modules/tasks/domain/task-assignment/task_assignment_contract_snapshot'
import {
  isTaskContractChangeDecisionV1,
  verifyTaskContractChangeDecision,
  type TaskContractChangeDecisionV1,
} from '#modules/tasks/domain/task-authoring/task_contract_change_classifier'
import type TaskAssignmentContractHead from '#modules/tasks/infra/models/task-assignment/task_assignment_contract_head'
import type TaskAssignmentSnapshot from '#modules/tasks/infra/models/task-assignment/task_assignment_snapshot'
import { isTaskAssignmentSnapshotV1 } from '#modules/tasks/public_contracts/task-authoring/validators'

export {
  ACTIVE_REVIEW_DISPUTE_STATUSES,
  assertGovernedSuccessorPersistenceAllowed,
  assertResolvedReadinessHistoryIntegrity,
  findGovernedAssignmentLifecycle,
  type GovernedAssignmentLifecycle,
}

export function lucidTransaction(transaction?: TaskTransaction): TransactionClientContract | undefined {
  return transaction as TransactionClientContract | undefined
}

export function toJsonRecord(value: object): Record<string, unknown> {
  return value as unknown as Record<string, unknown>
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isValidAcknowledgementBasis(value: unknown, acknowledgementRequired: boolean): boolean {
  if (!isRecord(value)) return false
  const kind = value['kind']
  if (kind === 'fresh_assignment') {
    return (
      value['previousSnapshotId'] === null &&
      value['previousAcknowledgementState'] === null &&
      value['changeClass'] === 'initial' &&
      acknowledgementRequired
    )
  }
  if (kind === 'reacknowledgement_required') {
    return (
      typeof value['previousSnapshotId'] === 'string' &&
      ['pending', 'acknowledged', 'clarification_requested'].includes(
        String(value['previousAcknowledgementState'])
      ) &&
      typeof value['changeClass'] === 'string' &&
      value['changeClass'] !== 'initial' &&
      acknowledgementRequired
    )
  }
  if (kind === 'acknowledgement_carried_forward') {
    return (
      typeof value['previousSnapshotId'] === 'string' &&
      value['previousAcknowledgementState'] === 'acknowledged' &&
      ['editorial', 'clarification', 'deadline_priority'].includes(String(value['changeClass'])) &&
      !acknowledgementRequired
    )
  }
  return false
}

export function capabilityRubricVersionIds(
  resolvedContract: CanonicalTaskAssignmentContractSnapshotV1['snapshot']['resolvedContract']
): string[] {
  return [
    ...new Set(
      resolvedContract.evidence.capabilities
        .map((capability) => capability.rubricVersionId)
        .filter((id): id is string => id !== null)
    ),
  ].sort()
}

export function assertCanonicalEnvelope(
  envelope: CanonicalTaskAssignmentContractSnapshotV1,
  idempotencyKey: string,
  hasher: TaskContractContentHasher
): void {
  const rawBasis = (envelope as { acknowledgementBasis?: unknown }).acknowledgementBasis
  const rawChangeDecision = (envelope as { changeDecision?: unknown }).changeDecision
  const validAcknowledgementBasis = isValidAcknowledgementBasis(
    rawBasis,
    envelope.snapshot.acknowledgementRequired
  )
  if (
    (envelope as { schemaVersion: unknown }).schemaVersion !==
      'suar.task_assignment_contract_snapshot.v1' ||
    !isTaskAssignmentSnapshotV1(envelope.snapshot) ||
    !isTaskContractChangeDecisionV1(rawChangeDecision) ||
    Object.keys(envelope.workFieldProvenance).length === 0 ||
    envelope.snapshot.roleInTask !== envelope.snapshot.resolvedContract.work.roleInTask ||
    envelope.snapshot.ownershipLevel !== envelope.snapshot.resolvedContract.work.ownershipLevel ||
    envelope.snapshot.provenance.projectContextVersionId !==
      envelope.snapshot.resolvedContract.inheritedFrom.projectContextVersionId ||
    envelope.snapshot.provenance.workPackageVersionId !==
      envelope.snapshot.resolvedContract.inheritedFrom.workPackageVersionId ||
    envelope.snapshot.provenance.taskContractVersionId !==
      envelope.snapshot.resolvedContract.versionId ||
    envelope.snapshot.provenance.taskSpecificationVersionId !==
      envelope.snapshot.resolvedContract.specification.versionId ||
    !isDeepStrictEqual(
      envelope.snapshot.provenance.capabilityRubricVersionIds,
      capabilityRubricVersionIds(envelope.snapshot.resolvedContract)
    ) ||
    !validAcknowledgementBasis ||
    !idempotencyKey.trim()
  ) {
    throw new InvariantViolationException(
      'Assignment Contract repository received an invalid canonical snapshot envelope'
    )
  }

  const decisionChangeClass = envelope.changeDecision.changeClass ?? 'editorial'
  if (
    (envelope.acknowledgementBasis.kind === 'fresh_assignment'
      ? !verifyTaskContractChangeDecision({
          decision: envelope.changeDecision,
          previous: null,
          next: envelope.snapshot.resolvedContract,
        })
      : envelope.changeDecision.changeClass === 'initial' ||
        envelope.acknowledgementBasis.changeClass !== decisionChangeClass ||
        (envelope.acknowledgementBasis.kind === 'acknowledgement_carried_forward' &&
          envelope.changeDecision.requiresReack))
  ) {
    throw new InvariantViolationException(
      'Assignment Contract snapshot change decision contradicts its acknowledgement basis'
    )
  }

  const { snapshotHash, ...snapshotWithoutHash } = envelope.snapshot
  const recomputedHash = hasher.hash({
    envelopeSchemaVersion: envelope.schemaVersion,
    snapshot: snapshotWithoutHash,
    workFieldProvenance: envelope.workFieldProvenance,
    acknowledgementBasis: envelope.acknowledgementBasis,
    changeDecision: envelope.changeDecision,
  })
  if (recomputedHash !== snapshotHash) {
    throw new InvariantViolationException(
      'Assignment Contract snapshot declared hash does not match its canonical content'
    )
  }
}

export function assertInput(
  input: PersistTaskAssignmentContractSnapshotInput,
  hasher: TaskContractContentHasher
): void {
  assertCanonicalEnvelope(input.envelope, input.idempotencyKey, hasher)
  if (!Number.isInteger(input.expectedHeadRevision) || input.expectedHeadRevision < 0) {
    throw new InvariantViolationException(
      'Assignment Contract expected head revision must be a non-negative integer'
    )
  }
}

export function assertSnapshotRowIntegrity(
  snapshot: TaskAssignmentSnapshot,
  hasher: TaskContractContentHasher
): CanonicalTaskAssignmentContractSnapshotV1 {
  const envelope = snapshot.canonical_snapshot
  if (
    !envelope ||
    !snapshot.snapshot_hash ||
    snapshot.snapshot_sequence === null ||
    snapshot.acknowledgement_required === null ||
    !snapshot.idempotency_key
  ) {
    throw new InvariantViolationException('Native assignment Contract snapshot row is incomplete')
  }
  assertCanonicalEnvelope(envelope, snapshot.idempotency_key, hasher)

  const canonical = envelope.snapshot
  const expectedAcceptanceSnapshot = {
    acceptanceCriteria: canonical.resolvedContract.work.acceptanceCriteria,
    verificationMethods: canonical.resolvedContract.evidence.verificationMethods,
  }
  const expectedWorkflowSnapshot = {
    acknowledgementRequired: canonical.acknowledgementRequired,
    acknowledgementBasis: envelope.acknowledgementBasis,
    readiness: canonical.resolvedContract.readiness,
  }
  if (
    snapshot.schema_version !== envelope.schemaVersion ||
    canonical.id !== snapshot.id ||
    canonical.assignmentId !== snapshot.task_assignment_id ||
    canonical.taskId !== snapshot.task_id ||
    canonical.resolvedContract.taskId !== snapshot.task_id ||
    canonical.snapshotHash !== snapshot.snapshot_hash ||
    canonical.acknowledgementRequired !== snapshot.acknowledgement_required ||
    canonical.provenance.taskSpecificationVersionId !== snapshot.task_specification_version_id ||
    canonical.provenance.taskContractVersionId !== snapshot.task_contract_version_id ||
    !isDeepStrictEqual(snapshot.task_snapshot, canonical.resolvedContract) ||
    !isDeepStrictEqual(snapshot.acceptance_criteria_snapshot, expectedAcceptanceSnapshot) ||
    !isDeepStrictEqual(snapshot.workflow_snapshot, expectedWorkflowSnapshot)
  ) {
    throw new InvariantViolationException(
      'Assignment Contract canonical envelope and immutable snapshot row are inconsistent'
    )
  }

  return envelope
}

export function assertHeadIntegrity(
  head: TaskAssignmentContractHead,
  currentSnapshot: TaskAssignmentSnapshot
): void {
  if (
    head.task_assignment_id !== currentSnapshot.task_assignment_id ||
    head.task_id !== currentSnapshot.task_id ||
    head.current_snapshot_id !== currentSnapshot.id ||
    head.expected_snapshot_hash !== currentSnapshot.snapshot_hash ||
    head.revision !== currentSnapshot.snapshot_sequence
  ) {
    throw new InvariantViolationException(
      'Assignment Contract mutable head and immutable current snapshot are inconsistent'
    )
  }
}

export function assertSuccessorChangeIntegrity(
  previous: TaskAssignmentContractSnapshotRecord,
  next: CanonicalTaskAssignmentContractSnapshotV1
): TaskContractChangeDecisionV1 {
  const decision = next.changeDecision
  const validHistoricalDecision = verifyTaskContractChangeDecision({
    decision,
    previous: previous.envelope.snapshot.resolvedContract,
    next: next.snapshot.resolvedContract,
  })
  const expectedChangeClass = decision.changeClass ?? 'editorial'
  const basis = next.acknowledgementBasis
  if (
    !validHistoricalDecision ||
    basis.kind === 'fresh_assignment' ||
    basis.changeClass !== expectedChangeClass ||
    (basis.kind === 'acknowledgement_carried_forward' && decision.requiresReack)
  ) {
    throw new InvariantViolationException(
      'Assignment Contract successor acknowledgement basis contradicts the canonical content change'
    )
  }
  return decision
}

export interface TaskAssignmentLockedInteractionContext {
  assignmentId: string
  assigneeId: string
  assignmentState: string
  taskState: 'cancelled' | 'active'
  assigneeActive: boolean
  acknowledgementRequired: boolean
  clarificationOpen: boolean
  currentSnapshot: {
    snapshotId: string
    snapshotHash: `sha256:${string}`
    contractVersionHead: number
  }
  existingAcknowledgement: {
    assignmentId: string
    assigneeId: string
    snapshotId: string
    snapshotHash: string
    contractVersionHead: number
    acknowledgedAt: string
  } | null
}

export function assertInteractionPersistenceFence(
  context: TaskAssignmentLockedInteractionContext | null,
  interaction: 'acknowledgement' | 'clarification'
): asserts context is TaskAssignmentLockedInteractionContext {
  if (
    !context ||
    context.assignmentState !== 'active' ||
    context.taskState !== 'active' ||
    !context.assigneeActive ||
    !context.acknowledgementRequired ||
    (interaction === 'acknowledgement' && context.clarificationOpen)
  ) {
    throw new ConflictException(
      `Assignment ${interaction} is no longer valid for the locked lifecycle state`
    )
  }
}

export function mapRecord(
  snapshot: TaskAssignmentSnapshot,
  envelope: CanonicalTaskAssignmentContractSnapshotV1,
  acknowledgementState: TaskAssignmentAcknowledgementState,
  replayed: boolean
): TaskAssignmentContractSnapshotRecord {
  return {
    id: snapshot.id,
    assignmentId: snapshot.task_assignment_id,
    taskId: snapshot.task_id,
    sequence: snapshot.snapshot_sequence as number,
    previousSnapshotId: snapshot.previous_snapshot_id,
    envelope,
    snapshotHash: snapshot.snapshot_hash as `sha256:${string}`,
    acknowledgementRequired: snapshot.acknowledgement_required as boolean,
    acknowledgementState,
    idempotencyKey: snapshot.idempotency_key as string,
    replayed,
  }
}

export function requiredTransaction(transaction: TaskTransaction): TransactionClientContract {
  const trx = lucidTransaction(transaction)
  if (!trx) throw new InvariantViolationException('Assignment Contract transaction is required')
  return trx
}

export function iso(date: DateTime, field: string): string {
  const value = date.toUTC().toISO()
  if (!value) throw new InvariantViolationException(`${field} is not a valid timestamp`)
  return value
}

export async function lockInteractionIdempotencyKey(
  trx: TransactionClientContract,
  kind: 'acknowledgement' | 'clarification',
  actorId: string,
  idempotencyKey: string
): Promise<void> {
  await trx.rawQuery('SELECT pg_advisory_xact_lock(hashtextextended(?, 0))', [
    `task-assignment:${kind}:${actorId}:${idempotencyKey}`,
  ])
}
