import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  assertHeadIntegrity,
  assertSnapshotRowIntegrity,
  assertSuccessorChangeIntegrity,
  mapRecord,
} from './task_assignment_contract_invariants.js'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type {
  TaskAssignmentAcknowledgementState,
  TaskAssignmentContractSnapshotRecord,
} from '#modules/tasks/actions/ports/outbound/task_assignment_contract_repository'
import type { TaskContractContentHasher } from '#modules/tasks/actions/ports/outbound/task_contract_content_hasher'
import TaskAssignmentAcknowledgement from '#modules/tasks/infra/models/task-assignment/task_assignment_acknowledgement'
import TaskAssignmentClarificationRequest from '#modules/tasks/infra/models/task-assignment/task_assignment_clarification_request'
import TaskAssignmentContractHead from '#modules/tasks/infra/models/task-assignment/task_assignment_contract_head'
import TaskAssignmentSnapshot from '#modules/tasks/infra/models/task-assignment/task_assignment_snapshot'

export async function loadTaskAssignmentHistory(
  assignmentId: string,
  hasher: TaskContractContentHasher,
  trx?: TransactionClientContract,
  knownHead?: TaskAssignmentContractHead | null
): Promise<TaskAssignmentContractSnapshotRecord[]> {
  const snapshotQuery = trx
    ? TaskAssignmentSnapshot.query({ client: trx })
    : TaskAssignmentSnapshot.query()
  const snapshots = await snapshotQuery
    .where('task_assignment_id', assignmentId)
    .whereNotNull('schema_version')
    .orderBy('snapshot_sequence', 'asc')
  const head =
    knownHead === undefined
      ? await (
          trx
            ? TaskAssignmentContractHead.query({ client: trx })
            : TaskAssignmentContractHead.query()
        )
          .where('task_assignment_id', assignmentId)
          .first()
      : knownHead

  if (snapshots.length === 0) {
    if (head) {
      throw new InvariantViolationException(
        'Assignment Contract head exists without immutable snapshots'
      )
    }
    return []
  }
  if (!head) {
    throw new InvariantViolationException(
      'Native assignment Contract snapshots exist without a mutable head'
    )
  }

  const snapshotIds = snapshots.map((snapshot) => snapshot.id)
  const acknowledgementQuery = trx
    ? TaskAssignmentAcknowledgement.query({ client: trx })
    : TaskAssignmentAcknowledgement.query()
  const clarificationQuery = trx
    ? TaskAssignmentClarificationRequest.query({ client: trx })
    : TaskAssignmentClarificationRequest.query()
  const [acknowledgements, openClarifications] = await Promise.all([
    acknowledgementQuery.whereIn('snapshot_id', snapshotIds),
    clarificationQuery.whereIn('snapshot_id', snapshotIds).where('state', 'open'),
  ])
  const acknowledgedSnapshotIds = new Set(
    acknowledgements.map((acknowledgement) => acknowledgement.snapshot_id)
  )
  const clarificationSnapshotIds = new Set(
    openClarifications.map((clarification) => clarification.snapshot_id)
  )

  const records: TaskAssignmentContractSnapshotRecord[] = []
  let previous: TaskAssignmentSnapshot | null = null
  for (const [index, snapshot] of snapshots.entries()) {
    const envelope = assertSnapshotRowIntegrity(snapshot, hasher)
    const basis = envelope.acknowledgementBasis
    const expectedSequence = index + 1
    if (
      snapshot.snapshot_sequence !== expectedSequence ||
      snapshot.previous_snapshot_id !== (previous?.id ?? null) ||
      (index === 0
        ? basis.kind !== 'fresh_assignment'
        : basis.kind === 'fresh_assignment' || basis.previousSnapshotId !== previous?.id)
    ) {
      throw new InvariantViolationException(
        'Assignment Contract immutable snapshot chain is discontinuous'
      )
    }
    const hasAcknowledgement = acknowledgedSnapshotIds.has(snapshot.id)
    const hasOpenClarification = clarificationSnapshotIds.has(snapshot.id)
    const snapshotAcknowledgements = acknowledgements.filter(
      (acknowledgement) => acknowledgement.snapshot_id === snapshot.id
    )
    const snapshotClarifications = openClarifications.filter(
      (clarification) => clarification.snapshot_id === snapshot.id
    )
    if (
      snapshotAcknowledgements.some(
        (acknowledgement) =>
          acknowledgement.task_assignment_id !== assignmentId ||
          acknowledgement.assignee_id !== envelope.snapshot.assigneeId ||
          acknowledgement.snapshot_hash !== snapshot.snapshot_hash
      ) ||
      snapshotClarifications.some(
        (clarification) =>
          clarification.task_assignment_id !== assignmentId ||
          clarification.requested_by !== envelope.snapshot.assigneeId
      )
    ) {
      throw new InvariantViolationException(
        'Assignment Contract interaction fact crosses immutable assignment boundaries'
      )
    }
    if (
      !snapshot.acknowledgement_required &&
      (hasAcknowledgement || hasOpenClarification)
    ) {
      throw new InvariantViolationException(
        'Assignment Contract acknowledgement facts are inconsistent'
      )
    }
    const previousRecord = records.at(-1)
    if (previousRecord) {
      assertSuccessorChangeIntegrity(previousRecord, envelope)
    }
    if (
      basis.kind !== 'fresh_assignment' &&
      basis.previousAcknowledgementState !== previousRecord?.acknowledgementState
    ) {
      throw new InvariantViolationException(
        'Assignment Contract successor basis misstates predecessor acknowledgement state'
      )
    }
    if (
      basis.kind === 'acknowledgement_carried_forward' &&
      previousRecord?.acknowledgementState !== 'acknowledged'
    ) {
      throw new InvariantViolationException(
        'Assignment Contract carry-forward basis does not reference an acknowledged predecessor'
      )
    }
    const acknowledgementState: TaskAssignmentAcknowledgementState =
      basis.kind === 'acknowledgement_carried_forward'
        ? 'acknowledged'
        : snapshot.acknowledgement_required === false
          ? 'not_required'
          : hasAcknowledgement
            ? 'acknowledged'
            : hasOpenClarification
              ? 'clarification_requested'
              : 'pending'
    records.push(mapRecord(snapshot, envelope, acknowledgementState, false))
    previous = snapshot
  }

  const currentSnapshot = snapshots.at(-1) as TaskAssignmentSnapshot
  assertHeadIntegrity(head, currentSnapshot)
  const currentRecord = records.at(-1) as TaskAssignmentContractSnapshotRecord
  if (head.acknowledgement_state !== currentRecord.acknowledgementState) {
    throw new InvariantViolationException(
      'Assignment Contract head acknowledgement state does not match its immutable facts'
    )
  }
  return records
}
