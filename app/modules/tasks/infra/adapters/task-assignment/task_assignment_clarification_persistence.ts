import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  assertInteractionPersistenceFence,
  assertSnapshotRowIntegrity,
  iso,
  lockInteractionIdempotencyKey,
  requiredTransaction,
  type TaskAssignmentLockedInteractionContext,
} from './task_assignment_contract_invariants.js'

import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type {
  PersistTaskAssignmentClarificationInput,
  TaskAssignmentContractSnapshotRecord,
  TaskAssignmentInteractionReplayLookupInput,
} from '#modules/tasks/actions/ports/outbound/task_assignment_contract_repository'
import type { TaskContractContentHasher } from '#modules/tasks/actions/ports/outbound/task_contract_content_hasher'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import {
  assignmentClarificationRequestHashInput,
} from '#modules/tasks/domain/task-assignment/task_assignment_interaction_request'
import TaskAssignmentClarificationRequest from '#modules/tasks/infra/models/task-assignment/task_assignment_clarification_request'
import type TaskAssignmentContractHead from '#modules/tasks/infra/models/task-assignment/task_assignment_contract_head'
import TaskAssignmentContractHeadModel from '#modules/tasks/infra/models/task-assignment/task_assignment_contract_head'
import TaskAssignmentSnapshot from '#modules/tasks/infra/models/task-assignment/task_assignment_snapshot'

export class TaskAssignmentClarificationPersistence {
  constructor(private readonly hasher: TaskContractContentHasher) {}

  async findClarificationReplay(
    input: TaskAssignmentInteractionReplayLookupInput,
    transaction: TaskTransaction
  ) {
    const trx = requiredTransaction(transaction)
    await lockInteractionIdempotencyKey(
      trx,
      'clarification',
      input.actorId,
      input.idempotencyKey
    )
    const replay = await TaskAssignmentClarificationRequest.query({ client: trx })
      .where('requested_by', input.actorId)
      .where('idempotency_key', input.idempotencyKey)
      .first()
    if (!replay) return null

    const snapshot = await TaskAssignmentSnapshot.query({ client: trx })
      .where('id', replay.snapshot_id)
      .first()
    if (!snapshot) {
      throw new InvariantViolationException(
        'Assignment clarification references a missing immutable snapshot'
      )
    }
    const envelope = assertSnapshotRowIntegrity(snapshot, this.hasher)
    const contractVersionHead = snapshot.snapshot_sequence
    if (contractVersionHead === null || !Number.isSafeInteger(contractVersionHead)) {
      throw new InvariantViolationException(
        'Assignment clarification references a legacy or invalid snapshot sequence'
      )
    }
    const durableFact = {
      requestId: replay.id,
      assignmentId: replay.task_assignment_id,
      requestedBy: replay.requested_by,
      snapshotId: replay.snapshot_id,
      snapshotHash: snapshot.snapshot_hash as `sha256:${string}`,
      contractVersionHead,
      requestedAt: iso(replay.created_at, 'Assignment clarification created_at'),
    }
    const durableRequestHash = this.hasher.hash(
      assignmentClarificationRequestHashInput({ request: durableFact, reason: replay.reason })
    )
    if (
      envelope.snapshot.assignmentId !== durableFact.assignmentId ||
      envelope.snapshot.assigneeId !== durableFact.requestedBy ||
      replay.request_hash !== durableRequestHash
    ) {
      throw new InvariantViolationException(
        'Assignment clarification replay failed durable integrity validation'
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
        'Assignment clarification idempotency key was reused with a different request'
      )
    }
    return { fact: durableFact, replayed: true }
  }

  async persistClarification(
    input: PersistTaskAssignmentClarificationInput,
    transaction: TaskTransaction,
    lockContext: (
      assignmentId: string,
      transaction: TaskTransaction,
      loadHistory: (
        assignmentId: string,
        trx?: TransactionClientContract,
        knownHead?: TaskAssignmentContractHead | null
      ) => Promise<TaskAssignmentContractSnapshotRecord[]>
    ) => Promise<TaskAssignmentLockedInteractionContext | null>,
    loadHistory: (
      assignmentId: string,
      trx?: TransactionClientContract,
      knownHead?: TaskAssignmentContractHead | null
    ) => Promise<TaskAssignmentContractSnapshotRecord[]>
  ) {
    const trx = requiredTransaction(transaction)
    const reason = input.reason.trim()
    if (
      !reason ||
      !input.idempotencyKey.trim() ||
      this.hasher.hash(
        assignmentClarificationRequestHashInput({ request: input.request, reason })
      ) !== input.requestHash
    ) {
      throw new InvariantViolationException(
        'Assignment clarification persistence input failed integrity validation'
      )
    }
    const context = await lockContext(input.request.assignmentId, transaction, loadHistory)
    assertInteractionPersistenceFence(context, 'clarification')
    if (
      context.assigneeId !== input.request.requestedBy ||
      context.currentSnapshot.snapshotId !== input.request.snapshotId ||
      context.currentSnapshot.snapshotHash !== input.request.snapshotHash ||
      context.currentSnapshot.contractVersionHead !== input.request.contractVersionHead
    ) {
      throw new ConflictException('Assignment clarification targets a stale Contract snapshot')
    }

    const replay = await TaskAssignmentClarificationRequest.query({ client: trx })
      .where('requested_by', input.request.requestedBy)
      .where('idempotency_key', input.idempotencyKey)
      .first()
    if (replay) {
      if (
        replay.request_hash !== input.requestHash ||
        replay.task_assignment_id !== input.request.assignmentId ||
        replay.snapshot_id !== input.request.snapshotId ||
        replay.reason !== reason
      ) {
        throw new ConflictException(
          'Assignment clarification idempotency key was reused with a different request'
        )
      }
      return {
        replayed: true,
        fact: {
          requestId: replay.id,
          assignmentId: replay.task_assignment_id,
          requestedBy: replay.requested_by,
          snapshotId: replay.snapshot_id,
          snapshotHash: input.request.snapshotHash,
          contractVersionHead: input.request.contractVersionHead,
          requestedAt: iso(replay.created_at, 'Assignment clarification created_at'),
        },
      }
    }
    const existingOpen = await TaskAssignmentClarificationRequest.query({ client: trx })
      .where('task_assignment_id', input.request.assignmentId)
      .where('snapshot_id', input.request.snapshotId)
      .where('state', 'open')
      .first()
    if (existingOpen) {
      throw new ConflictException('Assignment Contract already has an open clarification request')
    }

    const clarification = await TaskAssignmentClarificationRequest.create(
      {
        id: input.request.requestId,
        schema_version: 'suar.task_assignment_clarification.v1',
        task_assignment_id: input.request.assignmentId,
        snapshot_id: input.request.snapshotId,
        requested_by: input.request.requestedBy,
        reason,
        state: 'open',
        idempotency_key: input.idempotencyKey,
        request_hash: input.requestHash,
      },
      { client: trx }
    )
    if (!context.existingAcknowledgement || context.existingAcknowledgement.snapshotId !== input.request.snapshotId) {
      const head = await TaskAssignmentContractHeadModel.query({ client: trx })
        .where('task_assignment_id', input.request.assignmentId)
        .forUpdate()
        .firstOrFail()
      head.acknowledgement_state = 'clarification_requested'
      await head.save()
    }

    return {
      replayed: false,
      fact: {
        ...input.request,
        requestedAt: iso(clarification.created_at, 'Assignment clarification created_at'),
      },
    }
  }
}
