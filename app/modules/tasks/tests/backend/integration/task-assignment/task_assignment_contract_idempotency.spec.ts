import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import {
  assignmentId,
  cleanupScenario,
  createScenario,
  envelope,
  hash,
  repository,
  taskId,
} from './task_assignment_contract_test_support.js'

import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

test.group('Integration | Task assignment Contract repository - Idempotency & Lifecycle', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.each.setup(() => createScenario())
  group.each.teardown(() => cleanupScenario())
  group.teardown(() => teardownApp())

  test('persists the initial immutable snapshot and returns a stable idempotent replay', async ({
    assert,
  }) => {
    const input = {
      envelope: envelope(),
      idempotencyKey: 'assign-contract-v1',
      expectedHeadRevision: 0,
    }
    const initial = await db.transaction((trx) => repository.persistSnapshot(input, trx))
    const replay = await db.transaction((trx) => repository.persistSnapshot(input, trx))

    assert.equal(initial.sequence, 1)
    assert.isNull(initial.previousSnapshotId)
    assert.isFalse(initial.replayed)
    assert.deepEqual(
      { ...replay, replayed: false },
      initial,
      'A retry must reconstruct the same durable response'
    )
    assert.isTrue(replay.replayed)
    assert.lengthOf(await db.from('task_assignment_snapshots').where('task_id', taskId), 1)
  })

  test('serializes concurrent retries so one durable snapshot wins and the other replays it', async ({
    assert,
  }) => {
    const input = {
      envelope: envelope(),
      idempotencyKey: 'assignment-concurrent-retry',
      expectedHeadRevision: 0,
    }
    const outcomes = await Promise.all([
      db.transaction((trx) => repository.persistSnapshot(input, trx)),
      db.transaction((trx) => repository.persistSnapshot(input, trx)),
    ])

    assert.sameMembers(
      outcomes.map((outcome) => outcome.replayed),
      [false, true]
    )
    assert.equal(outcomes[0].id, outcomes[1].id)
    assert.equal(outcomes[0].snapshotHash, outcomes[1].snapshotHash)
    assert.lengthOf(await db.from('task_assignment_snapshots').where('task_id', taskId), 1)
  })

  test('rejects an idempotency key collision with a different canonical payload', async ({
    assert,
  }) => {
    await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'assignment-key-collision',
          expectedHeadRevision: 0,
        },
        trx
      )
    )

    await assert.rejects(
      () =>
        db.transaction((trx) =>
          repository.persistSnapshot(
            {
              envelope: envelope({
                id: randomUUID(),
              }),
              idempotencyKey: 'assignment-key-collision',
              expectedHeadRevision: 1,
            },
            trx
          )
        ),
      ConflictException
    )
    assert.lengthOf(await db.from('task_assignment_snapshots').where('task_id', taskId), 1)
  })

  test('rejects a forged declared hash before any snapshot or head is stored', async ({
    assert,
  }) => {
    await assert.rejects(
      () =>
        db.transaction((trx) =>
          repository.persistSnapshot(
            {
              envelope: envelope({ snapshotHash: hash('c') }),
              idempotencyKey: 'assignment-forged-hash',
              expectedHeadRevision: 0,
            },
            trx
          )
        ),
      InvariantViolationException
    )
    assert.lengthOf(await db.from('task_assignment_snapshots').where('task_id', taskId), 0)
    assert.lengthOf(await db.from('task_assignment_contract_heads').where('task_id', taskId), 0)
  })

  test('rolls a stale successor back without moving the mutable head', async ({ assert }) => {
    const initial = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'assignment-initial',
          expectedHeadRevision: 0,
        },
        trx
      )
    )

    await assert.rejects(
      () =>
        db.transaction((trx) =>
          repository.persistSnapshot(
            {
              envelope: envelope({
                id: randomUUID(),
                acknowledgementBasis: {
                  kind: 'reacknowledgement_required',
                  previousSnapshotId: initial.id,
                  previousAcknowledgementState: 'pending',
                  changeClass: 'editorial',
                },
              }),
              idempotencyKey: 'assignment-stale-successor',
              expectedHeadRevision: 0,
            },
            trx
          )
        ),
      ConflictException
    )

    const current = await repository.findCurrent(assignmentId)
    assert.equal(current?.id, initial.id)
    assert.equal(current?.sequence, 1)
    assert.lengthOf(await db.from('task_assignment_snapshots').where('task_id', taskId), 1)
  })

  test('retains the immutable successor chain and reads history separately from current', async ({
    assert,
  }) => {
    const firstInput = {
      envelope: envelope(),
      idempotencyKey: 'assignment-history-v1',
      expectedHeadRevision: 0,
    }
    const first = await db.transaction((trx) => repository.persistSnapshot(firstInput, trx))
    const secondEnvelope = envelope({
      id: randomUUID(),
      createdAt: '2026-08-01T09:00:00.000Z',
      acknowledgementBasis: {
        kind: 'reacknowledgement_required',
        previousSnapshotId: first.id,
        previousAcknowledgementState: 'pending',
        changeClass: 'editorial',
      },
    })
    const second = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: secondEnvelope,
          idempotencyKey: 'assignment-history-v2',
          expectedHeadRevision: 1,
        },
        trx
      )
    )

    const history = await repository.findHistory(assignmentId)
    const current = await repository.findCurrent(assignmentId)
    const replayedFirst = await db.transaction((trx) => repository.persistSnapshot(firstInput, trx))

    assert.deepEqual(
      history.map((record) => [record.id, record.sequence, record.previousSnapshotId]),
      [
        [first.id, 1, null],
        [second.id, 2, first.id],
      ]
    )
    assert.equal(current?.id, second.id)
    assert.equal(current?.snapshotHash, secondEnvelope.snapshot.snapshotHash)
    assert.equal(replayedFirst.id, first.id)
    assert.equal(replayedFirst.sequence, 1)
    assert.isTrue(replayedFirst.replayed)
    assert.equal(
      history[0]?.envelope.snapshot.resolvedContract.title,
      first.envelope.snapshot.resolvedContract.title
    )
  })

  test('fails closed when the mutable head or canonical immutable row violates integrity', async ({
    assert,
  }) => {
    const persisted = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'assignment-integrity',
          expectedHeadRevision: 0,
        },
        trx
      )
    )
    await db
      .from('task_assignment_contract_heads')
      .where('task_assignment_id', assignmentId)
      .update({ expected_snapshot_hash: hash('f') })
    await assert.rejects(() => repository.findCurrent(assignmentId), InvariantViolationException)

    await db
      .from('task_assignment_snapshots')
      .where('id', persisted.id)
      .update({
        canonical_snapshot: JSON.stringify({
          ...persisted.envelope,
          snapshot: { ...persisted.envelope.snapshot, snapshotHash: hash('0') },
        }),
      })
    await assert.rejects(() => repository.findCurrent(assignmentId), InvariantViolationException)
  })
})
