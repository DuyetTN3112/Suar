import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import {
  assertPostgresConstraintError,
  assigneeId,
  assignmentId,
  baseBundle,
  cleanupScenario,
  createScenario,
  creatorId,
  envelope,
  hash,
  hasher,
  materialSuccessorEnvelope,
  materiallyChangedBundle,
  organizationId,
  persistMaterialAuthoringBundle,
  projectId,
  repository,
  taskId,
} from './task_assignment_contract_test_support.js'

import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type { CanonicalTaskAssignmentContractSnapshotV1 } from '#modules/tasks/domain/task-assignment/task_assignment_contract_snapshot'
import {
  assignmentAcknowledgementRequestHashInput,
  assignmentClarificationRequestHashInput,
} from '#modules/tasks/domain/task-assignment/task_assignment_interaction_request'
import { INITIAL_TASK_CONTRACT_CHANGE_DECISION_V1 } from '#modules/tasks/domain/task-authoring/task_contract_change_classifier'
import TaskSpecificationContractRepository from '#modules/tasks/infra/repositories/task-authoring/task_specification_contract_repository'
import {
  TASK_CONTRACT_VERSION_V1_FIXTURE,
  TASK_SPECIFICATION_VERSION_V1_FIXTURE,
} from '#modules/tasks/public_contracts/task-authoring/golden_fixtures'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  TaskAssignmentFactory,
  TaskFactory,
} from '#tests/helpers/factories/project_task'
import { UserFactory } from '#tests/helpers/factories/user_org'

test.group('Integration | Task assignment Contract repository - Security & Invariant Guards', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.each.setup(() => createScenario())
  group.each.teardown(() => cleanupScenario())
  group.teardown(() => teardownApp())

  test('@security rejects self-consistent but forged immutable classifier metadata', async ({
    assert,
  }) => {
    const forged = envelope({
      changeDecision: {
        ...INITIAL_TASK_CONTRACT_CHANGE_DECISION_V1,
        code: 'TVA.CHANGE.NONE',
        codes: [],
      },
    })

    await assert.rejects(
      () =>
        db.transaction((trx) =>
          repository.persistSnapshot(
            {
              envelope: forged,
              idempotencyKey: 'forged-initial-classifier-decision',
              expectedHeadRevision: 0,
            },
            trx
          )
        ),
      InvariantViolationException
    )
    assert.lengthOf(await db.from('task_assignment_snapshots').where('task_id', taskId), 0)
  })

  test('@security rejects self-consistent readiness history claims absent from authoring facts', async ({
    assert,
  }) => {
    const forged = envelope({ readinessFindingCodesResolved: ['TVA.FORGED.RESOLVED'] })

    await assert.rejects(
      () =>
        db.transaction((trx) =>
          repository.persistSnapshot(
            {
              envelope: forged,
              idempotencyKey: 'forged-readiness-resolution-history',
              expectedHeadRevision: 0,
            },
            trx
          )
        ),
      InvariantViolationException
    )
    assert.lengthOf(await db.from('task_assignment_snapshots').where('task_id', taskId), 0)
  })

  test('@security verifies a stored V1 successor decision against its immutable predecessor', async ({
    assert,
  }) => {
    const first = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'classifier-history-predecessor',
          expectedHeadRevision: 0,
        },
        trx
      )
    )
    const changedBundle = await persistMaterialAuthoringBundle()
    const validSuccessor = materialSuccessorEnvelope(first, changedBundle)
    const forgedDecision = {
      ...validSuccessor.changeDecision,
      changedPaths: [],
    }
    const { snapshotHash: _snapshotHash, ...snapshotWithoutHash } = validSuccessor.snapshot
    const forgedSuccessor: CanonicalTaskAssignmentContractSnapshotV1 = {
      ...validSuccessor,
      changeDecision: forgedDecision,
      snapshot: {
        ...snapshotWithoutHash,
        snapshotHash: hasher.hash({
          envelopeSchemaVersion: validSuccessor.schemaVersion,
          snapshot: snapshotWithoutHash,
          workFieldProvenance: validSuccessor.workFieldProvenance,
          acknowledgementBasis: validSuccessor.acknowledgementBasis,
          changeDecision: forgedDecision,
        }),
      },
    }

    await assert.rejects(
      () =>
        db.transaction((trx) =>
          repository.persistSnapshot(
            {
              envelope: forgedSuccessor,
              idempotencyKey: 'forged-successor-classifier-decision',
              expectedHeadRevision: 1,
            },
            trx
          )
        ),
      InvariantViolationException
    )
    assert.lengthOf(await db.from('task_assignment_snapshots').where('task_id', taskId), 1)
  })

  test('@security rejects canonical authoring version and capability rubric pins that do not exactly match the resolved Contract', async ({
    assert,
  }) => {
    const wrongContractVersion = {
      ...baseBundle.contract.resolvedContract,
      versionId: randomUUID(),
    }
    const wrongSpecificationVersion = {
      ...baseBundle.contract.resolvedContract,
      specification: {
        ...baseBundle.contract.resolvedContract.specification,
        versionId: randomUUID(),
      },
    }

    for (const [idempotencyKey, forgedEnvelope] of [
      ['forged-resolved-contract-version', envelope({ resolvedContract: wrongContractVersion })],
      [
        'forged-resolved-specification-version',
        envelope({ resolvedContract: wrongSpecificationVersion }),
      ],
      ['forged-capability-rubric-pins', envelope({ capabilityRubricVersionIds: [] })],
    ] as const) {
      await assert.rejects(
        () =>
          db.transaction((trx) =>
            repository.persistSnapshot(
              {
                envelope: forgedEnvelope,
                idempotencyKey,
                expectedHeadRevision: 0,
              },
              trx
            )
          ),
        InvariantViolationException
      )
    }

    assert.lengthOf(await db.from('task_assignment_snapshots').where('task_id', taskId), 0)
  })

  test('@security revalidates durable Specification and Contract content hashes before pinning them', async ({
    assert,
  }) => {
    await db
      .from('task_specification_versions')
      .where('id', TASK_SPECIFICATION_VERSION_V1_FIXTURE.id)
      .update({ content_hash: hash('e') })

    await assert.rejects(
      () =>
        db.transaction((trx) =>
          repository.persistSnapshot(
            {
              envelope: envelope(),
              idempotencyKey: 'durable-specification-hash-corruption',
              expectedHeadRevision: 0,
            },
            trx
          )
        ),
      InvariantViolationException
    )
    await db
      .from('task_specification_versions')
      .where('id', TASK_SPECIFICATION_VERSION_V1_FIXTURE.id)
      .update({ content_hash: baseBundle.specification.contentHash })

    await db
      .from('task_contract_versions')
      .where('id', TASK_CONTRACT_VERSION_V1_FIXTURE.id)
      .update({ content_hash: hash('f') })

    await assert.rejects(
      () =>
        db.transaction((trx) =>
          repository.persistSnapshot(
            {
              envelope: envelope(),
              idempotencyKey: 'durable-contract-hash-corruption',
              expectedHeadRevision: 0,
            },
            trx
          )
        ),
      InvariantViolationException
    )
    assert.lengthOf(await db.from('task_assignment_snapshots').where('task_id', taskId), 0)
  })

  test('@security rejects a successor whose canonical timestamp does not advance beyond its predecessor', async ({
    assert,
  }) => {
    const first = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'strict-time-predecessor',
          expectedHeadRevision: 0,
        },
        trx
      )
    )
    const nonAdvancing = envelope({
      id: randomUUID(),
      createdAt: first.envelope.snapshot.createdAt,
      acknowledgementBasis: {
        kind: 'reacknowledgement_required',
        previousSnapshotId: first.id,
        previousAcknowledgementState: 'pending',
        changeClass: 'editorial',
      },
    })

    await assert.rejects(
      () =>
        db.transaction((trx) =>
          repository.persistSnapshot(
            {
              envelope: nonAdvancing,
              idempotencyKey: 'strict-time-non-advancing',
              expectedHeadRevision: 1,
            },
            trx
          )
        ),
      InvariantViolationException
    )
    const current = await repository.findCurrent(assignmentId)
    assert.equal(current?.id, first.id)
  })

  test('@security database fences reject a second active assignment and application checks mismatched native Contract/Specification pairs', async ({
    assert,
  }) => {
    await assertPostgresConstraintError(
      () =>
        TaskAssignmentFactory.create({
          id: randomUUID(),
          task_id: taskId,
          assignee_id: assigneeId,
          assigned_by: creatorId,
          assignment_status: 'active',
        }),
      '23505',
      'uq_task_assignments_one_active_task'
    )

    const initial = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'database-authoring-pin-initial',
          expectedHeadRevision: 0,
        },
        trx
      )
    )

    const invalidLegacySnapshot = {
      task_assignment_id: assignmentId,
      task_id: taskId,
      snapshot_reason: `legacy-${randomUUID().slice(0, 8)}`,
      task_snapshot: {},
      required_skills_snapshot: [],
      acceptance_criteria_snapshot: {},
      workflow_snapshot: {},
    }
    const legacySnapshotId = randomUUID()
    const predecessorSnapshotId = randomUUID()
    await db.table('task_assignment_snapshots').insert({
      id: legacySnapshotId,
      ...invalidLegacySnapshot,
      idempotency_key: `legacy-must-not-own-idempotency:${randomUUID()}`,
    })
    await db.table('task_assignment_snapshots').insert({
      id: predecessorSnapshotId,
      ...invalidLegacySnapshot,
      snapshot_reason: `legacy-${randomUUID().slice(0, 8)}`,
      previous_snapshot_id: initial.id,
    })
    await db
      .from('task_assignment_snapshots')
      .whereIn('id', [legacySnapshotId, predecessorSnapshotId])
      .delete()

    const v2 = materiallyChangedBundle()
    await db.transaction((trx) =>
      TaskSpecificationContractRepository.persistContractBundle(v2, trx)
    )

    await db
      .from('task_assignment_snapshots')
      .where('id', initial.id)
      .update({ task_contract_version_id: v2.contract.id })
    await assert.rejects(() => repository.findCurrent(assignmentId), InvariantViolationException)
  })

  test('@security rejects acknowledgement and clarification facts pinned to another assignment snapshot', async ({
    assert,
  }) => {
    const primary = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'security-cross-assignment-primary',
          expectedHeadRevision: 0,
        },
        trx
      )
    )
    const otherAssignmentId = randomUUID()
    const otherAssigneeId = randomUUID()
    const otherTaskId = randomUUID()

    try {
      await UserFactory.create({ id: otherAssigneeId })
      await TaskFactory.create({
        id: otherTaskId,
        organization_id: organizationId,
        project_id: projectId,
        creator_id: creatorId,
        assigned_to: otherAssigneeId,
      })
      await TaskAssignmentFactory.create({
        id: otherAssignmentId,
        task_id: otherTaskId,
        assignee_id: otherAssigneeId,
        assigned_by: creatorId,
      })
      const acknowledgementFact = {
        assignmentId: otherAssignmentId,
        assigneeId: otherAssigneeId,
        snapshotId: primary.id,
        snapshotHash: primary.snapshotHash,
        contractVersionHead: primary.sequence,
        acknowledgedAt: '2026-08-01T10:40:00.000Z',
      }
      const clarificationRequest = {
        requestId: randomUUID(),
        assignmentId: otherAssignmentId,
        requestedBy: otherAssigneeId,
        snapshotId: primary.id,
        snapshotHash: primary.snapshotHash,
        contractVersionHead: primary.sequence,
        requestedAt: '2026-08-01T10:41:00.000Z',
      }
      const clarificationReason = 'Attempt to bind a clarification to another assignment.'

      await assert.rejects(
        () =>
          db.transaction((trx) =>
            repository.persistAcknowledgement(
              {
                fact: acknowledgementFact,
                idempotencyKey: 'security-cross-assignment-ack',
                requestHash: hasher.hash(
                  assignmentAcknowledgementRequestHashInput(acknowledgementFact)
                ),
              },
              trx
            )
          ),
        ConflictException
      )
      await assert.rejects(
        () =>
          db.transaction((trx) =>
            repository.persistClarification(
              {
                request: clarificationRequest,
                reason: clarificationReason,
                idempotencyKey: 'security-cross-assignment-clarification',
                requestHash: hasher.hash(
                  assignmentClarificationRequestHashInput({
                    request: clarificationRequest,
                    reason: clarificationReason,
                  })
                ),
              },
              trx
            )
          ),
        ConflictException
      )

      const current = await repository.findCurrent(assignmentId)
      assert.equal(current?.id, primary.id)
      assert.lengthOf(
        await db
          .from('task_assignment_acknowledgements')
          .whereIn('task_assignment_id', [assignmentId, otherAssignmentId]),
        0
      )
      assert.lengthOf(
        await db
          .from('task_assignment_clarification_requests')
          .whereIn('task_assignment_id', [assignmentId, otherAssignmentId]),
        0
      )
    } finally {
      await db
        .from('task_assignment_clarification_requests')
        .where('task_assignment_id', otherAssignmentId)
        .delete()
      await db
        .from('task_assignment_acknowledgements')
        .where('task_assignment_id', otherAssignmentId)
        .delete()
      await db
        .from('task_assignment_contract_heads')
        .where('task_assignment_id', otherAssignmentId)
        .delete()
      await db
        .from('task_assignment_snapshots')
        .where('task_assignment_id', otherAssignmentId)
        .delete()
      await db.from('task_assignments').where('id', otherAssignmentId).delete()
      await db.from('tasks').where('id', otherTaskId).delete()
      await db.from('users').where('id', otherAssigneeId).delete()
    }
  })
})
