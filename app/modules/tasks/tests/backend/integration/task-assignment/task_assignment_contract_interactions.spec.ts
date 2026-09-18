import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import {
  actionContext,
  assigneeId,
  assignmentId,
  cleanupScenario,
  createScenario,
  creatorId,
  envelope,
  hash,
  interactionDependencies,
  organizationId,
  repository,
} from './task_assignment_contract_test_support.js'

import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import AcknowledgeTaskAssignmentContractCommand from '#modules/tasks/actions/commands/task-assignment/acknowledge_task_assignment_contract_command'
import RequestTaskAssignmentClarificationCommand from '#modules/tasks/actions/commands/task-assignment/request_task_assignment_clarification_command'
import User from '#modules/users/infra/models/profile/user'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { OrganizationUserFactory } from '#tests/helpers/factories/user_org'

test.group('Integration | Task assignment Contract repository - Interactions & HTTP Boundary', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.each.setup(() => createScenario())
  group.each.teardown(() => cleanupScenario())
  group.teardown(() => teardownApp())

  test('persists one exact acknowledgement fact and replays retries without mutation', async ({
    assert,
  }) => {
    const snapshot = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'assignment-before-ack',
          expectedHeadRevision: 0,
        },
        trx
      )
    )
    const command = new AcknowledgeTaskAssignmentContractCommand(
      actionContext,
      interactionDependencies()
    )
    const dto = {
      assignmentId,
      snapshotId: snapshot.id,
      snapshotHash: snapshot.snapshotHash,
      contractVersionHead: snapshot.sequence,
      idempotencyKey: 'ack-exact-retry',
    }

    const first = await command.execute(dto)
    const replay = await command.execute(dto)
    const current = await repository.findCurrent(assignmentId)

    assert.isFalse(first.replayed)
    assert.isTrue(replay.replayed)
    assert.deepEqual(replay.fact, first.fact)
    await assert.rejects(
      () => command.execute({ ...dto, snapshotHash: hash('e') }),
      ConflictException
    )
    assert.equal(current?.acknowledgementState, 'acknowledged')
    assert.lengthOf(
      await db.from('task_assignment_acknowledgements').where('task_assignment_id', assignmentId),
      1
    )
  })

  test('replays an exact acknowledgement after the assignment lifecycle has closed', async ({
    assert,
  }) => {
    const snapshot = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'assignment-before-closed-ack-retry',
          expectedHeadRevision: 0,
        },
        trx
      )
    )
    const command = new AcknowledgeTaskAssignmentContractCommand(
      actionContext,
      interactionDependencies()
    )
    const dto = {
      assignmentId,
      snapshotId: snapshot.id,
      snapshotHash: snapshot.snapshotHash,
      contractVersionHead: snapshot.sequence,
      idempotencyKey: 'ack-retry-after-closed-lifecycle',
    }
    const first = await command.execute(dto)
    await db
      .from('task_assignments')
      .where('id', assignmentId)
      .update({ assignment_status: 'completed', completed_at: new Date() })

    const replay = await command.execute(dto)

    assert.isFalse(first.replayed)
    assert.isTrue(replay.replayed)
    assert.deepEqual(replay.fact, first.fact)
    await assert.rejects(
      () => command.execute({ ...dto, snapshotHash: hash('f') }),
      ConflictException
    )
  })

  test('persists clarification independently, replays it, and blocks acknowledgement while open', async ({
    assert,
  }) => {
    const snapshot = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'assignment-before-clarification',
          expectedHeadRevision: 0,
        },
        trx
      )
    )
    const clarification = new RequestTaskAssignmentClarificationCommand(
      actionContext,
      interactionDependencies()
    )
    const dto = {
      assignmentId,
      snapshotId: snapshot.id,
      snapshotHash: snapshot.snapshotHash,
      contractVersionHead: snapshot.sequence,
      reason: 'Clarify rollback ownership before I accept this Contract.',
      idempotencyKey: 'clarification-exact-retry',
    }

    const first = await clarification.execute(dto)
    const replay = await clarification.execute(dto)
    const current = await repository.findCurrent(assignmentId)

    assert.isFalse(first.replayed)
    assert.isTrue(replay.replayed)
    assert.deepEqual(replay.fact, first.fact)
    assert.equal(current?.acknowledgementState, 'clarification_requested')
    assert.lengthOf(
      await db.from('task_assignment_clarification_requests').where('task_assignment_id', assignmentId),
      1
    )

    const acknowledge = new AcknowledgeTaskAssignmentContractCommand(
      actionContext,
      interactionDependencies()
    )
    await assert.rejects(
      () =>
        acknowledge.execute({
          assignmentId,
          snapshotId: snapshot.id,
          snapshotHash: snapshot.snapshotHash,
          contractVersionHead: snapshot.sequence,
          idempotencyKey: 'ack-before-clarification-resolved',
        }),
      'TVA.ASSIGNMENT.CLARIFICATION_UNRESOLVED'
    )
  })

  test('replays an exact clarification after the assignment lifecycle has closed', async ({
    assert,
  }) => {
    const snapshot = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'assignment-before-closed-clarification-retry',
          expectedHeadRevision: 0,
        },
        trx
      )
    )
    const command = new RequestTaskAssignmentClarificationCommand(
      actionContext,
      interactionDependencies()
    )
    const dto = {
      assignmentId,
      snapshotId: snapshot.id,
      snapshotHash: snapshot.snapshotHash,
      contractVersionHead: snapshot.sequence,
      reason: 'Clarify the rollback owner before work continues.',
      idempotencyKey: 'clarification-retry-after-closed-lifecycle',
    }
    const first = await command.execute(dto)
    await db
      .from('task_assignments')
      .where('id', assignmentId)
      .update({ assignment_status: 'completed', completed_at: new Date() })

    const replay = await command.execute(dto)

    assert.isFalse(first.replayed)
    assert.isTrue(replay.replayed)
    assert.deepEqual(replay.fact, first.fact)
    await assert.rejects(
      () => command.execute({ ...dto, reason: 'A different request reusing the same key.' }),
      ConflictException
    )
  })

  test('a post-ack clarification never revokes or replaces the immutable acknowledgement', async ({
    assert,
  }) => {
    const snapshot = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'assignment-ack-then-clarify',
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
      snapshotId: snapshot.id,
      snapshotHash: snapshot.snapshotHash,
      contractVersionHead: snapshot.sequence,
      idempotencyKey: 'ack-before-post-ack-question',
    })
    await new RequestTaskAssignmentClarificationCommand(
      actionContext,
      interactionDependencies('2026-08-01T10:05:00.000Z')
    ).execute({
      assignmentId,
      snapshotId: snapshot.id,
      snapshotHash: snapshot.snapshotHash,
      contractVersionHead: snapshot.sequence,
      reason: 'Record a non-revoking follow-up question.',
      idempotencyKey: 'post-ack-question',
    })

    const current = await repository.findCurrent(assignmentId)
    assert.equal(current?.acknowledgementState, 'acknowledged')
    assert.lengthOf(
      await db.from('task_assignment_acknowledgements').where('task_assignment_id', assignmentId),
      1
    )
    assert.lengthOf(
      await db
        .from('task_assignment_clarification_requests')
        .where('task_assignment_id', assignmentId),
      1
    )
  })

  test('carries acknowledgement only through an immutable basis that points to an acknowledged predecessor', async ({
    assert,
  }) => {
    const first = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'assignment-before-carry-forward',
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
      idempotencyKey: 'ack-before-carry-forward',
    })
    const carriedEnvelope = envelope({
      id: randomUUID(),
      createdAt: '2026-08-01T10:10:00.000Z',
      acknowledgementRequired: false,
      acknowledgementBasis: {
        kind: 'acknowledgement_carried_forward',
        previousSnapshotId: first.id,
        previousAcknowledgementState: 'acknowledged',
        changeClass: 'editorial',
      },
    })

    const carried = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: carriedEnvelope,
          idempotencyKey: 'editorial-carry-forward',
          expectedHeadRevision: 1,
        },
        trx
      )
    )
    const history = await repository.findHistory(assignmentId)

    assert.equal(carried.acknowledgementState, 'acknowledged')
    assert.equal(history[1]?.envelope.acknowledgementBasis.previousSnapshotId, first.id)
    assert.lengthOf(
      await db.from('task_assignment_acknowledgements').where('task_assignment_id', assignmentId),
      1,
      'carry-forward must not forge a second actor acknowledgement fact'
    )
  })

  test('rejects acknowledgement carry-forward from a predecessor that is still pending', async ({
    assert,
  }) => {
    const first = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'pending-before-invalid-carry',
          expectedHeadRevision: 0,
        },
        trx
      )
    )
    const invalidCarry = envelope({
      id: randomUUID(),
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
              envelope: invalidCarry,
              idempotencyKey: 'invalid-pending-carry',
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

  test('exposes acknowledgement and clarification through the canonical v1 HTTP boundary', async ({
    assert,
    client,
  }) => {
    const assignee = await User.findOrFail(assigneeId)
    await OrganizationUserFactory.create({
      organization_id: organizationId,
      user_id: assigneeId,
      org_role: 'org_member',
      status: 'approved',
    })
    await assignee.merge({ current_organization_id: organizationId }).save()

    const snapshot = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'http-interaction-snapshot',
          expectedHeadRevision: 0,
        },
        trx
      )
    )
    const basePayload = {
      assignmentId,
      snapshotId: snapshot.id,
      snapshotHash: snapshot.snapshotHash,
      contractVersionHead: snapshot.sequence,
    }

    const owner = await User.findOrFail(creatorId)
    const unauthorizedResponse = await client
      .post(`/api/v1/task-assignments/${assignmentId}/acknowledgement`)
      .loginAs(owner)
      .json({ ...basePayload, idempotencyKey: 'http-unauthorized-acknowledgement' })
    unauthorizedResponse.assertStatus(400)

    const clarificationResponse = await client
      .post(`/api/v1/task-assignments/${assignmentId}/clarifications`)
      .loginAs(assignee)
      .json({
        ...basePayload,
        reason: 'Clarify the acceptance boundary before execution.',
        idempotencyKey: 'http-clarification-request',
      })
    clarificationResponse.assertStatus(200)
    const afterClarification = await repository.findCurrent(assignmentId)
    assert.equal(afterClarification?.acknowledgementState, 'clarification_requested')

    const acknowledgementResponse = await client
      .post(`/api/v1/task-assignments/${assignmentId}/acknowledgement`)
      .loginAs(assignee)
      .json({
        ...basePayload,
        idempotencyKey: 'http-acknowledgement-request',
      })
    acknowledgementResponse.assertStatus(400)
    const afterRejectedAcknowledgement = await repository.findCurrent(assignmentId)
    assert.equal(afterRejectedAcknowledgement?.acknowledgementState, 'clarification_requested')
  })
})
