import { isDeepStrictEqual } from 'node:util'

import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import {
  assertGovernedSuccessorPersistenceAllowed,
  assertHeadIntegrity,
  assertInput,
  assertResolvedReadinessHistoryIntegrity,
  assertSnapshotRowIntegrity,
  assertSuccessorChangeIntegrity,
  iso,
  lucidTransaction,
  mapRecord,
  toJsonRecord,
} from './task_assignment_contract_invariants.js'

import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type {
  PersistTaskAssignmentContractSnapshotInput,
  TaskAssignmentAcknowledgementState,
  TaskAssignmentContractSnapshotRecord,
} from '#modules/tasks/actions/ports/outbound/task_assignment_contract_repository'
import type { TaskContractContentHasher } from '#modules/tasks/actions/ports/outbound/task_contract_content_hasher'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import { assertTaskSpecificationContractIntegrity } from '#modules/tasks/infra/adapters/task-authoring/task_contract_integrity'
import {
  mapTaskContractVersionModel,
  mapTaskSpecificationVersionModel,
} from '#modules/tasks/infra/adapters/task-authoring/task_contract_model_mapper'
import TaskAssignment from '#modules/tasks/infra/models/task-assignment/task_assignment'
import TaskAssignmentContractHead from '#modules/tasks/infra/models/task-assignment/task_assignment_contract_head'
import TaskAssignmentSnapshot from '#modules/tasks/infra/models/task-assignment/task_assignment_snapshot'
import Task from '#modules/tasks/infra/models/task-authoring/task'
import TaskContractVersion from '#modules/tasks/infra/models/task-authoring/task_contract_version'
import TaskSpecificationVersion from '#modules/tasks/infra/models/task-authoring/task_specification_version'

export class TaskAssignmentSnapshotWriter {
  constructor(private readonly hasher: TaskContractContentHasher) {}

  async persistSnapshot(
    input: PersistTaskAssignmentContractSnapshotInput,
    transaction: TaskTransaction,
    loadHistory: (
      assignmentId: string,
      trx?: TransactionClientContract,
      knownHead?: TaskAssignmentContractHead | null
    ) => Promise<TaskAssignmentContractSnapshotRecord[]>
  ): Promise<TaskAssignmentContractSnapshotRecord> {
    assertInput(input, this.hasher)
    const trx = lucidTransaction(transaction)
    if (!trx) throw new InvariantViolationException('Assignment snapshot transaction is required')
    const canonical = input.envelope.snapshot

    const task = await Task.query({ client: trx }).where('id', canonical.taskId).forUpdate().first()
    if (
      !task ||
      task.deleted_at !== null ||
      task.status === 'cancelled' ||
      task.organization_id !== canonical.organizationId ||
      task.project_id !== canonical.projectId
    ) {
      throw new InvariantViolationException(
        'Assignment Contract snapshot does not match the durable Task boundary'
      )
    }
    await trx.rawQuery('SELECT pg_advisory_xact_lock(hashtextextended(?, 0))', [
      canonical.assignmentId,
    ])
    const assignment = await TaskAssignment.query({ client: trx })
      .where('id', canonical.assignmentId)
      .forUpdate()
      .first()
    if (
      !assignment ||
      assignment.assignment_status !== 'active' ||
      assignment.task_id !== canonical.taskId ||
      assignment.assignee_id !== canonical.assigneeId ||
      assignment.assigned_by !== canonical.assignedBy
    ) {
      throw new InvariantViolationException(
        'Assignment Contract snapshot does not match the durable task assignment'
      )
    }
    const [contract, specification] = await Promise.all([
      TaskContractVersion.query({ client: trx })
        .where('id', canonical.provenance.taskContractVersionId)
        .first(),
      TaskSpecificationVersion.query({ client: trx })
        .where('id', canonical.provenance.taskSpecificationVersionId)
        .first(),
    ])
    if (contract && specification) {
      assertTaskSpecificationContractIntegrity({
        expectedTaskId: canonical.taskId,
        specification: mapTaskSpecificationVersionModel(specification),
        contract: mapTaskContractVersionModel(contract),
        hasher: this.hasher,
      })
    }
    if (
      !contract ||
      !specification ||
      contract.task_id !== canonical.taskId ||
      specification.task_id !== canonical.taskId ||
      contract.task_specification_version_id !== specification.id ||
      contract.creator_confirmed_by !== canonical.creatorConfirmation.confirmedBy ||
      !contract.creator_confirmed_at ||
      iso(contract.creator_confirmed_at, 'Task Contract creator confirmation') !==
        canonical.creatorConfirmation.confirmedAt ||
      canonical.roleInTask !== canonical.resolvedContract.work.roleInTask ||
      canonical.ownershipLevel !== canonical.resolvedContract.work.ownershipLevel ||
      canonical.provenance.projectContextVersionId !==
        canonical.resolvedContract.inheritedFrom.projectContextVersionId ||
      canonical.provenance.workPackageVersionId !==
        canonical.resolvedContract.inheritedFrom.workPackageVersionId ||
      !isDeepStrictEqual(contract.resolved_contract, canonical.resolvedContract) ||
      !isDeepStrictEqual(contract.resolution_provenance, input.envelope.workFieldProvenance)
    ) {
      throw new InvariantViolationException(
        'Assignment Contract snapshot references foreign or inconsistent authoring facts'
      )
    }
    await assertResolvedReadinessHistoryIntegrity({
      trx,
      envelope: input.envelope,
      hasher: this.hasher,
    })

    const existing = await TaskAssignmentSnapshot.query({ client: trx })
      .where('task_assignment_id', canonical.assignmentId)
      .where('idempotency_key', input.idempotencyKey)
      .first()
    if (existing) {
      const persistedEnvelope = assertSnapshotRowIntegrity(existing, this.hasher)
      if (
        existing.snapshot_hash !== canonical.snapshotHash ||
        existing.id !== canonical.id ||
        !isDeepStrictEqual(persistedEnvelope, input.envelope)
      ) {
        throw new ConflictException(
          'Assignment snapshot idempotency key was reused with a different payload'
        )
      }
      const history = await loadHistory(canonical.assignmentId, trx)
      const replay = history.find((record) => record.id === existing.id)
      if (!replay) {
        throw new InvariantViolationException(
          'Idempotent assignment snapshot is absent from its immutable history'
        )
      }
      return { ...replay, replayed: true }
    }

    const head = await TaskAssignmentContractHead.query({ client: trx })
      .where('task_assignment_id', canonical.assignmentId)
      .forUpdate()
      .first()
    const existingHistory = await loadHistory(canonical.assignmentId, trx, head)
    const previousRecord = existingHistory.at(-1)
    const basis = input.envelope.acknowledgementBasis
    if (
      (head === null && basis.kind !== 'fresh_assignment') ||
      (head !== null &&
        (basis.kind === 'fresh_assignment' ||
          basis.previousSnapshotId !== previousRecord?.id ||
          basis.previousAcknowledgementState !== previousRecord.acknowledgementState))
    ) {
      throw new InvariantViolationException(
        'Assignment Contract successor acknowledgement basis does not match the immutable predecessor'
      )
    }
    const actualRevision = head?.revision ?? 0
    if (actualRevision !== input.expectedHeadRevision) {
      throw new ConflictException('Assignment Contract head revision is stale', {
        expectedHeadRevision: input.expectedHeadRevision,
        actualHeadRevision: actualRevision,
      })
    }
    if (previousRecord) {
      const change = assertSuccessorChangeIntegrity(previousRecord, input.envelope)
      await assertGovernedSuccessorPersistenceAllowed({
        trx,
        taskId: canonical.taskId,
        assignmentId: canonical.assignmentId,
        reacknowledgementRequired:
          basis.kind === 'reacknowledgement_required' || change.requiresReack,
      })
    }
    const sequence = actualRevision + 1
    const canonicalCreatedAt = DateTime.fromISO(canonical.createdAt, { zone: 'utc' })
    const previousCreatedAt = previousRecord
      ? DateTime.fromISO(previousRecord.envelope.snapshot.createdAt, { zone: 'utc' })
      : null
    if (
      !canonicalCreatedAt.isValid ||
      (!previousRecord &&
        canonicalCreatedAt.toMillis() !== assignment.assigned_at.toUTC().toMillis()) ||
      (previousCreatedAt && canonicalCreatedAt.toMillis() <= previousCreatedAt.toMillis())
    ) {
      throw new InvariantViolationException(
        'Assignment Contract snapshot timestamp contradicts assignment chronology'
      )
    }
    const created = await TaskAssignmentSnapshot.create(
      {
        id: canonical.id,
        task_assignment_id: canonical.assignmentId,
        task_id: canonical.taskId,
        snapshot_reason: 'assigned',
        task_snapshot: toJsonRecord(canonical.resolvedContract),
        required_skills_snapshot: [],
        acceptance_criteria_snapshot: {
          acceptanceCriteria: canonical.resolvedContract.work.acceptanceCriteria,
          verificationMethods: canonical.resolvedContract.evidence.verificationMethods,
        },
        workflow_snapshot: {
          acknowledgementRequired: canonical.acknowledgementRequired,
          acknowledgementBasis: input.envelope.acknowledgementBasis,
          readiness: canonical.resolvedContract.readiness,
        },
        schema_version: input.envelope.schemaVersion,
        task_specification_version_id: canonical.provenance.taskSpecificationVersionId,
        task_contract_version_id: canonical.provenance.taskContractVersionId,
        snapshot_sequence: sequence,
        previous_snapshot_id: head?.current_snapshot_id ?? null,
        canonical_snapshot: input.envelope,
        snapshot_hash: canonical.snapshotHash,
        acknowledgement_required: canonical.acknowledgementRequired,
        idempotency_key: input.idempotencyKey,
      },
      { client: trx }
    )
    const acknowledgementState: TaskAssignmentAcknowledgementState =
      input.envelope.acknowledgementBasis.kind === 'acknowledgement_carried_forward'
        ? 'acknowledged'
        : canonical.acknowledgementRequired
          ? 'pending'
          : 'not_required'
    let nextHead: TaskAssignmentContractHead
    if (head) {
      head.merge({
        task_id: canonical.taskId,
        current_snapshot_id: created.id,
        revision: sequence,
        acknowledgement_state: acknowledgementState,
        expected_snapshot_hash: canonical.snapshotHash,
      })
      await head.save()
      nextHead = head
    } else {
      nextHead = await TaskAssignmentContractHead.create(
        {
          task_assignment_id: canonical.assignmentId,
          task_id: canonical.taskId,
          current_snapshot_id: created.id,
          revision: sequence,
          acknowledgement_state: acknowledgementState,
          expected_snapshot_hash: canonical.snapshotHash,
        },
        { client: trx }
      )
    }

    const persistedEnvelope = assertSnapshotRowIntegrity(created, this.hasher)
    assertHeadIntegrity(nextHead, created)
    return mapRecord(created, persistedEnvelope, acknowledgementState, false)
  }
}
