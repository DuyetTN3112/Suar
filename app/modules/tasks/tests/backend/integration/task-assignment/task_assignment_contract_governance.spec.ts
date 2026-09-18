import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import {
  actionContext,
  assigneeId,
  assignmentId,
  cleanupScenario,
  createReviewDispute,
  createReviewSession,
  createScenario,
  createTaskReviewWorkflow,
  creatorId,
  envelope,
  interactionDependencies,
  materialSuccessorEnvelope,
  materiallyChangedBundle,
  persistMaterialAuthoringBundle,
  repository,
  taskId,
} from './task_assignment_contract_test_support.js'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import AcknowledgeTaskAssignmentContractCommand from '#modules/tasks/actions/commands/task-assignment/acknowledge_task_assignment_contract_command'
import { classifyTaskContractChange } from '#modules/tasks/domain/task-authoring/task_contract_change_classifier'
import TaskSpecificationContractRepository from '#modules/tasks/infra/repositories/task-authoring/task_specification_contract_repository'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { TaskAssignmentFactory } from '#tests/helpers/factories/project_task'

test.group('Integration | Task assignment Contract repository - Review & Dispute Governance', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.each.setup(() => createScenario())
  group.each.teardown(() => cleanupScenario())
  group.teardown(() => teardownApp())

  test('@security rejects a materially changed successor forged as editorial acknowledgement carry-forward', async ({
    assert,
  }) => {
    const first = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'security-material-carry-predecessor',
          expectedHeadRevision: 0,
        },
        trx
      )
    )
    await new AcknowledgeTaskAssignmentContractCommand(
      actionContext,
      interactionDependencies()
    ).execute({
      assignmentId,
      snapshotId: first.id,
      snapshotHash: first.snapshotHash,
      contractVersionHead: first.sequence,
      idempotencyKey: 'security-material-carry-ack',
    })
    const changedBundle = materiallyChangedBundle()
    await db.transaction((trx) =>
      TaskSpecificationContractRepository.persistContractBundle(changedBundle, trx)
    )
    const changedContract = changedBundle.contract.resolvedContract
    const classification = classifyTaskContractChange({
      previous: first.envelope.snapshot.resolvedContract,
      next: changedContract,
    })
    assert.isTrue(classification.requiresReack, 'attack fixture must be materially different')
    const forged = envelope({
      id: randomUUID(),
      createdAt: '2026-08-01T10:30:00.000Z',
      resolvedContract: changedContract,
      taskSpecificationVersionId: changedBundle.specification.id,
      taskContractVersionId: changedBundle.contract.id,
      acknowledgementRequired: false,
      acknowledgementBasis: {
        kind: 'acknowledgement_carried_forward',
        previousSnapshotId: first.id,
        previousAcknowledgementState: 'acknowledged',
        changeClass: 'editorial',
      },
    })

    await assert.rejects(
      () =>
        db.transaction((trx) =>
          repository.persistSnapshot(
            {
              envelope: forged,
              idempotencyKey: 'security-forged-material-carry-forward',
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

  test('@security direct repository persistence blocks a material successor during active review', async ({
    assert,
  }) => {
    const first = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'governance-active-review-predecessor',
          expectedHeadRevision: 0,
        },
        trx
      )
    )
    const changedBundle = await persistMaterialAuthoringBundle()
    await createReviewSession(assignmentId, assigneeId, 'in_progress')

    await assert.rejects(
      () =>
        db.transaction((trx) =>
          repository.persistSnapshot(
            {
              envelope: materialSuccessorEnvelope(first, changedBundle),
              idempotencyKey: 'governance-material-during-review',
              expectedHeadRevision: 1,
            },
            trx
          )
        ),
      'TVA.ASSIGNMENT.GOVERNED_SUCCESSOR_CYCLE_REQUIRED'
    )
    await assert.rejects(
      () =>
        db.transaction((trx) =>
          repository.persistSnapshot(
            {
              envelope: envelope({
                id: randomUUID(),
                createdAt: '2026-08-01T09:35:00.000Z',
                acknowledgementBasis: {
                  kind: 'reacknowledgement_required',
                  previousSnapshotId: first.id,
                  previousAcknowledgementState: 'pending',
                  changeClass: 'editorial',
                },
              }),
              idempotencyKey: 'governance-editorial-reack-during-review',
              expectedHeadRevision: 1,
            },
            trx
          )
        ),
      'TVA.ASSIGNMENT.GOVERNED_SUCCESSOR_CYCLE_REQUIRED'
    )

    const current = await repository.findCurrent(assignmentId)
    assert.equal(current?.id, first.id)
    assert.lengthOf(await db.from('task_assignment_snapshots').where('task_id', taskId), 1)
  })

  test('@security direct repository persistence blocks a material successor during active dispute', async ({
    assert,
  }) => {
    const first = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'governance-active-dispute-predecessor',
          expectedHeadRevision: 0,
        },
        trx
      )
    )
    const changedBundle = await persistMaterialAuthoringBundle()
    const reviewSessionId = await createReviewSession(assignmentId, assigneeId, 'disputed')
    await createReviewDispute({
      reviewSessionId,
      targetAssignmentId: assignmentId,
      targetTaskId: taskId,
      revieweeId: assigneeId,
      status: 'pending',
    })

    await assert.rejects(
      () =>
        db.transaction((trx) =>
          repository.persistSnapshot(
            {
              envelope: materialSuccessorEnvelope(first, changedBundle),
              idempotencyKey: 'governance-material-during-dispute',
              expectedHeadRevision: 1,
            },
            trx
          )
        ),
      'TVA.ASSIGNMENT.GOVERNED_SUCCESSOR_CYCLE_REQUIRED'
    )

    const current = await repository.findCurrent(assignmentId)
    assert.equal(current?.id, first.id)
    assert.lengthOf(await db.from('task_assignment_snapshots').where('task_id', taskId), 1)
  })

  test('enforces workflow-only review state and permits the successor after workflow completion', async ({
    assert,
  }) => {
    const first = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'governance-workflow-only-predecessor',
          expectedHeadRevision: 0,
        },
        trx
      )
    )
    const changedBundle = await persistMaterialAuthoringBundle()
    const workflowId = await createTaskReviewWorkflow('in_review')

    await assert.rejects(
      () =>
        db.transaction((trx) =>
          repository.persistSnapshot(
            {
              envelope: materialSuccessorEnvelope(first, changedBundle),
              idempotencyKey: 'governance-material-during-workflow-review',
              expectedHeadRevision: 1,
            },
            trx
          )
        ),
      'TVA.ASSIGNMENT.GOVERNED_SUCCESSOR_CYCLE_REQUIRED'
    )

    await db
      .from('task_review_workflows')
      .where('id', workflowId)
      .update({ status: 'completed', updated_at: '2026-08-01T08:55:00.000Z' })
    const successor = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: materialSuccessorEnvelope(first, changedBundle),
          idempotencyKey: 'governance-material-after-workflow-completion',
          expectedHeadRevision: 1,
        },
        trx
      )
    )
    assert.equal(successor.sequence, 2)
  })

  test('allows a material successor after the exact assignment dispute is resolved', async ({
    assert,
  }) => {
    const first = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'governance-resolved-dispute-predecessor',
          expectedHeadRevision: 0,
        },
        trx
      )
    )
    const changedBundle = await persistMaterialAuthoringBundle()
    const reviewSessionId = await createReviewSession(assignmentId, assigneeId, 'completed')
    await createReviewDispute({
      reviewSessionId,
      targetAssignmentId: assignmentId,
      targetTaskId: taskId,
      revieweeId: assigneeId,
      status: 'resolved',
    })

    const successor = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: materialSuccessorEnvelope(first, changedBundle),
          idempotencyKey: 'governance-material-after-resolution',
          expectedHeadRevision: 1,
        },
        trx
      )
    )

    assert.equal(successor.sequence, 2)
    assert.equal(successor.previousSnapshotId, first.id)
    assert.equal(successor.acknowledgementState, 'pending')
  })

  test('isolates governed review and dispute state to the exact assignment', async ({ assert }) => {
    const first = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'governance-cross-assignment-predecessor',
          expectedHeadRevision: 0,
        },
        trx
      )
    )
    const changedBundle = await persistMaterialAuthoringBundle()
    const otherAssignmentId = randomUUID()
    let otherReviewSessionId: string | null = null

    try {
      await TaskAssignmentFactory.create({
        id: otherAssignmentId,
        task_id: taskId,
        assignee_id: assigneeId,
        assigned_by: creatorId,
        assignment_status: 'completed',
      })
      otherReviewSessionId = await createReviewSession(otherAssignmentId, assigneeId, 'in_progress')
      await createReviewDispute({
        reviewSessionId: otherReviewSessionId,
        targetAssignmentId: otherAssignmentId,
        targetTaskId: taskId,
        revieweeId: assigneeId,
        status: 'pending',
      })

      const successor = await db.transaction((trx) =>
        repository.persistSnapshot(
          {
            envelope: materialSuccessorEnvelope(first, changedBundle),
            idempotencyKey: 'governance-cross-assignment-material',
            expectedHeadRevision: 1,
          },
          trx
        )
      )
      assert.equal(successor.sequence, 2)
    } finally {
      await db.from('review_disputes').where('task_assignment_id', otherAssignmentId).delete()
      if (otherReviewSessionId) {
        await db.from('review_sessions').where('id', otherReviewSessionId).delete()
      }
      await db.from('task_assignments').where('id', otherAssignmentId).delete()
    }
  })

  test('preserves acknowledged editorial carry-forward during active review', async ({ assert }) => {
    const first = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'governance-editorial-predecessor',
          expectedHeadRevision: 0,
        },
        trx
      )
    )
    await new AcknowledgeTaskAssignmentContractCommand(
      actionContext,
      interactionDependencies()
    ).execute({
      assignmentId,
      snapshotId: first.id,
      snapshotHash: first.snapshotHash,
      contractVersionHead: first.sequence,
      idempotencyKey: 'governance-editorial-acknowledgement',
    })
    await createReviewSession(assignmentId, assigneeId, 'in_progress')

    const successor = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope({
            id: randomUUID(),
            createdAt: '2026-08-01T09:45:00.000Z',
            acknowledgementRequired: false,
            acknowledgementBasis: {
              kind: 'acknowledgement_carried_forward',
              previousSnapshotId: first.id,
              previousAcknowledgementState: 'acknowledged',
              changeClass: 'editorial',
            },
          }),
          idempotencyKey: 'governance-editorial-during-review',
          expectedHeadRevision: 1,
        },
        trx
      )
    )

    assert.equal(successor.sequence, 2)
    assert.equal(successor.acknowledgementState, 'acknowledged')
  })
})
