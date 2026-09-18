import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import { TaskAssignmentClarificationPersistence } from './task_assignment_clarification_persistence.js'
import {
  assertInteractionPersistenceFence,
  assertSnapshotRowIntegrity,
  iso,
  lockInteractionIdempotencyKey,
  requiredTransaction,
} from './task_assignment_contract_invariants.js'

import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type {
  PersistTaskAssignmentAcknowledgementInput,
  PersistTaskAssignmentClarificationInput,
  TaskAssignmentContractSnapshotRecord,
  TaskAssignmentInteractionReplayLookupInput,
} from '#modules/tasks/actions/ports/outbound/task_assignment_contract_repository'
import type { TaskContractContentHasher } from '#modules/tasks/actions/ports/outbound/task_contract_content_hasher'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import {
  assignmentAcknowledgementRequestHashInput,
} from '#modules/tasks/domain/task-assignment/task_assignment_interaction_request'
import TaskAssignment from '#modules/tasks/infra/models/task-assignment/task_assignment'
import TaskAssignmentAcknowledgement from '#modules/tasks/infra/models/task-assignment/task_assignment_acknowledgement'
import TaskAssignmentClarificationRequest from '#modules/tasks/infra/models/task-assignment/task_assignment_clarification_request'
import TaskAssignmentContractHead from '#modules/tasks/infra/models/task-assignment/task_assignment_contract_head'
import TaskAssignmentSnapshot from '#modules/tasks/infra/models/task-assignment/task_assignment_snapshot'
import Task from '#modules/tasks/infra/models/task-authoring/task'

export class TaskAssignmentInteractionPersistence {
  private readonly clarificationPersistence: TaskAssignmentClarificationPersistence

  constructor(private readonly hasher: TaskContractContentHasher) {
    this.clarificationPersistence = new TaskAssignmentClarificationPersistence(hasher)
  }

  async findAcknowledgementReplay(
    input: TaskAssignmentInteractionReplayLookupInput,
    transaction: TaskTransaction
  ) {
    const trx = requiredTransaction(transaction)
    await lockInteractionIdempotencyKey(
      trx,
      'acknowledgement',
      input.actorId,
      input.idempotencyKey
    )
    const replay = await TaskAssignmentAcknowledgement.query({ client: trx })
      .where('assignee_id', input.actorId)
      .where('idempotency_key', input.idempotencyKey)
      .first()
    if (!replay) return null

    const snapshot = await TaskAssignmentSnapshot.query({ client: trx })
      .where('id', replay.snapshot_id)
      .first()
    if (!snapshot) {
      throw new InvariantViolationException(
        'Assignment acknowledgement references a missing immutable snapshot'
      )
    }
    const envelope = assertSnapshotRowIntegrity(snapshot, this.hasher)
    const contractVersionHead = snapshot.snapshot_sequence
    if (contractVersionHead === null || !Number.isSafeInteger(contractVersionHead)) {
      throw new InvariantViolationException(
        'Assignment acknowledgement references a legacy or invalid snapshot sequence'
      )
    }
    const durableFact = {
      assignmentId: replay.task_assignment_id,
      assigneeId: replay.assignee_id,
      snapshotId: replay.snapshot_id,
      snapshotHash: replay.snapshot_hash,
      contractVersionHead,
      acknowledgedAt: iso(replay.acknowledged_at, 'Assignment acknowledgement acknowledged_at'),
    }
    const durableRequestHash = this.hasher.hash(
      assignmentAcknowledgementRequestHashInput(durableFact)
    )
    if (
      envelope.snapshot.assignmentId !== durableFact.assignmentId ||
      envelope.snapshot.assigneeId !== durableFact.assigneeId ||
      snapshot.snapshot_hash !== durableFact.snapshotHash ||
      replay.request_hash !== durableRequestHash
    ) {
      throw new InvariantViolationException(
        'Assignment acknowledgement replay failed durable integrity validation'
      )
    }
    if (
      input.requestHash !== durableRequestHash ||
      input.assignmentId !== durableFact.assignmentId ||
      input.snapshotId !== durableFact.snapshotId ||
      input.snapshotHash !== durableFact.snapshotHash ||
      input.contractVersionHead !== durableFact.contractVersionHead
    ) {
      throw new ConflictException(
        'Assignment acknowledgement idempotency key was reused with a different request'
      )
    }
    return { fact: durableFact, replayed: true }
  }

  findClarificationReplay(
    input: TaskAssignmentInteractionReplayLookupInput,
    transaction: TaskTransaction
  ) {
    return this.clarificationPersistence.findClarificationReplay(input, transaction)
  }

  async lockInteractionContext(
    assignmentId: string,
    transaction: TaskTransaction,
    loadHistory: (
      assignmentId: string,
      trx?: TransactionClientContract,
      knownHead?: TaskAssignmentContractHead | null
    ) => Promise<TaskAssignmentContractSnapshotRecord[]>
  ) {
    const trx = requiredTransaction(transaction)
    const assignmentPointer = await TaskAssignment.query({ client: trx })
      .where('id', assignmentId)
      .select('id', 'task_id')
      .first()
    if (!assignmentPointer) return null

    const task = await Task.query({ client: trx })
      .where('id', assignmentPointer.task_id)
      .forUpdate()
      .first()
    const assignment = await TaskAssignment.query({ client: trx })
      .where('id', assignmentId)
      .forUpdate()
      .first()
    if (!task || !assignment || assignment.task_id !== assignmentPointer.task_id) {
      throw new InvariantViolationException(
        'Assignment Contract interaction context changed while acquiring lifecycle locks'
      )
    }
    const assignee = (await trx
      .from('users')
      .select('status', 'deleted_at')
      .where('id', assignment.assignee_id)
      .forUpdate()
      .first()) as { status: string; deleted_at: Date | string | null } | undefined
    const head = await TaskAssignmentContractHead.query({ client: trx })
      .where('task_assignment_id', assignmentId)
      .forUpdate()
      .first()
    if (!head) return null

    const history = await loadHistory(assignmentId, trx, head)
    const current = history.at(-1)
    if (!current) {
      throw new InvariantViolationException(
        'Assignment Contract interaction head has no immutable current snapshot'
      )
    }
    if (!assignee) {
      throw new InvariantViolationException(
        'Assignment Contract interaction context is missing assignee state'
      )
    }
    if (
      current.taskId !== task.id ||
      current.envelope.snapshot.assigneeId !== assignment.assignee_id
    ) {
      throw new InvariantViolationException(
        'Assignment Contract interaction context crosses Task or assignee boundaries'
      )
    }
    const existingAcknowledgement = await TaskAssignmentAcknowledgement.query({ client: trx })
      .where('task_assignment_id', assignmentId)
      .orderBy('created_at', 'desc')
      .first()
    const openClarification = await TaskAssignmentClarificationRequest.query({ client: trx })
      .where('task_assignment_id', assignmentId)
      .where('snapshot_id', current.id)
      .where('state', 'open')
      .first()

    return {
      assignmentId,
      assigneeId: assignment.assignee_id,
      assignmentState: assignment.assignment_status,
      taskState:
        task.deleted_at !== null || task.status === 'cancelled'
          ? ('cancelled' as const)
          : ('active' as const),
      assigneeActive: assignee.status === 'active' && assignee.deleted_at === null,
      acknowledgementRequired: current.acknowledgementRequired,
      clarificationOpen: openClarification !== null,
      currentSnapshot: {
        snapshotId: current.id,
        snapshotHash: current.snapshotHash,
        contractVersionHead: current.sequence,
      },
      existingAcknowledgement: existingAcknowledgement
        ? {
            assignmentId: existingAcknowledgement.task_assignment_id,
            assigneeId: existingAcknowledgement.assignee_id,
            snapshotId: existingAcknowledgement.snapshot_id,
            snapshotHash: existingAcknowledgement.snapshot_hash,
            contractVersionHead:
              history.find((record) => record.id === existingAcknowledgement.snapshot_id)
                ?.sequence ?? 0,
            acknowledgedAt: iso(
              existingAcknowledgement.acknowledged_at,
              'Assignment acknowledgement acknowledged_at'
            ),
          }
        : null,
    }
  }

  async persistAcknowledgement(
    input: PersistTaskAssignmentAcknowledgementInput,
    transaction: TaskTransaction,
    loadHistory: (
      assignmentId: string,
      trx?: TransactionClientContract,
      knownHead?: TaskAssignmentContractHead | null
    ) => Promise<TaskAssignmentContractSnapshotRecord[]>
  ) {
    const trx = requiredTransaction(transaction)
    if (
      !input.idempotencyKey.trim() ||
      this.hasher.hash(assignmentAcknowledgementRequestHashInput(input.fact)) !== input.requestHash
    ) {
      throw new InvariantViolationException(
        'Assignment acknowledgement persistence input failed integrity validation'
      )
    }
    const context = await this.lockInteractionContext(input.fact.assignmentId, transaction, loadHistory)
    assertInteractionPersistenceFence(context, 'acknowledgement')
    if (
      context.assigneeId !== input.fact.assigneeId ||
      context.currentSnapshot.snapshotId !== input.fact.snapshotId ||
      context.currentSnapshot.snapshotHash !== input.fact.snapshotHash ||
      context.currentSnapshot.contractVersionHead !== input.fact.contractVersionHead
    ) {
      throw new ConflictException('Assignment acknowledgement targets a stale Contract snapshot')
    }

    const replay = await TaskAssignmentAcknowledgement.query({ client: trx })
      .where('assignee_id', input.fact.assigneeId)
      .where('idempotency_key', input.idempotencyKey)
      .first()
    if (replay) {
      if (
        replay.request_hash !== input.requestHash ||
        replay.task_assignment_id !== input.fact.assignmentId ||
        replay.snapshot_id !== input.fact.snapshotId
      ) {
        throw new ConflictException(
          'Assignment acknowledgement idempotency key was reused with a different request'
        )
      }
      return {
        replayed: true,
        fact: {
          assignmentId: replay.task_assignment_id,
          assigneeId: replay.assignee_id,
          snapshotId: replay.snapshot_id,
          snapshotHash: replay.snapshot_hash,
          contractVersionHead: input.fact.contractVersionHead,
          acknowledgedAt: iso(replay.acknowledged_at, 'Assignment acknowledgement acknowledged_at'),
        },
      }
    }

    const existingExact = await TaskAssignmentAcknowledgement.query({ client: trx })
      .where('task_assignment_id', input.fact.assignmentId)
      .where('snapshot_id', input.fact.snapshotId)
      .where('assignee_id', input.fact.assigneeId)
      .first()
    if (existingExact) {
      return {
        replayed: true,
        fact: {
          assignmentId: existingExact.task_assignment_id,
          assigneeId: existingExact.assignee_id,
          snapshotId: existingExact.snapshot_id,
          snapshotHash: existingExact.snapshot_hash,
          contractVersionHead: input.fact.contractVersionHead,
          acknowledgedAt: iso(
            existingExact.acknowledged_at,
            'Assignment acknowledgement acknowledged_at'
          ),
        },
      }
    }

    const acknowledgement = await TaskAssignmentAcknowledgement.create(
      {
        schema_version: 'suar.task_assignment_acknowledgement.v1',
        task_assignment_id: input.fact.assignmentId,
        snapshot_id: input.fact.snapshotId,
        assignee_id: input.fact.assigneeId,
        snapshot_hash: input.fact.snapshotHash,
        idempotency_key: input.idempotencyKey,
        request_hash: input.requestHash,
        acknowledged_at: DateTime.fromISO(input.fact.acknowledgedAt, { zone: 'utc' }),
      },
      { client: trx }
    )
    const head = await TaskAssignmentContractHead.query({ client: trx })
      .where('task_assignment_id', input.fact.assignmentId)
      .forUpdate()
      .firstOrFail()
    head.acknowledgement_state = 'acknowledged'
    await head.save()

    return {
      replayed: false,
      fact: {
        ...input.fact,
        acknowledgedAt: iso(acknowledgement.acknowledged_at, 'Assignment acknowledgement acknowledged_at'),
      },
    }
  }

  persistClarification(
    input: PersistTaskAssignmentClarificationInput,
    transaction: TaskTransaction,
    loadHistory: (
      assignmentId: string,
      trx?: TransactionClientContract,
      knownHead?: TaskAssignmentContractHead | null
    ) => Promise<TaskAssignmentContractSnapshotRecord[]>
  ) {
    return this.clarificationPersistence.persistClarification(
      input,
      transaction,
      (assignmentId, tx, historyLoader) => this.lockInteractionContext(assignmentId, tx, historyLoader),
      loadHistory
    )
  }
}
