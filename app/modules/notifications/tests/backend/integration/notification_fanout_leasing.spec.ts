import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { makeNotificationFanoutStager } from '#composition/notification_operations_composition'
import { PostgresNotificationFanoutRepository } from '#modules/notifications/infra/repositories/postgres_notification_fanout_repository'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory, cleanupTestData } from '#tests/helpers/factories'

const baseTime = new Date('2026-07-23T00:00:00.000Z')

async function cleanupFanoutData(): Promise<void> {
  await db.from('notification_fanout_targets').delete()
  await db.from('notification_fanout_jobs').delete()
}

test.group('Integration | Notification Fanout Leasing', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(async () => {
    await cleanupFanoutData()
    await cleanupTestData()
  })

  test('concurrent workers claim disjoint bounded target batches', async ({ assert }) => {
    const users = await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        UserFactory.create({ username: `fanout_claim_${String(index)}` })
      )
    )
    await db.transaction((trx) =>
      makeNotificationFanoutStager().stage(
        {
          eventName: 'review.batch_opened',
          businessEventId: randomUUID(),
          type: 'review_requested',
          schemaVersion: 1,
          scope: { kind: 'organization', id: randomUUID() },
          subject: { type: 'project_sprint', id: randomUUID() },
          parameters: { reason: 'concurrent_claim_test' },
          occurredAt: baseTime.toISOString(),
        },
        users.map((user) => user.id),
        { trx, now: baseTime }
      )
    )
    const repository = new PostgresNotificationFanoutRepository()

    const [first, second] = await Promise.all([
      repository.claimBatch({
        workerId: 'fanout-claim-a',
        batchSize: 3,
        leaseDurationMs: 30_000,
        now: baseTime,
      }),
      repository.claimBatch({
        workerId: 'fanout-claim-b',
        batchSize: 3,
        leaseDurationMs: 30_000,
        now: baseTime,
      }),
    ])

    assert.lengthOf(first, 3)
    assert.lengthOf(second, 3)
    assert.lengthOf(new Set([...first, ...second].map((target) => target.id)), 6)
    assert.isTrue([...first, ...second].every((target) => target.attemptCount === 1))
  })

  test('reclaims expired work and fences the stale lease holder', async ({ assert }) => {
    const user = await UserFactory.create({ username: 'fanout_lease_fencing' })
    await db.transaction((trx) =>
      makeNotificationFanoutStager().stage(
        {
          eventName: 'review.lease_opened',
          businessEventId: randomUUID(),
          type: 'review_requested',
          schemaVersion: 1,
          scope: { kind: 'organization', id: randomUUID() },
          parameters: { reason: 'lease_fencing_test' },
          occurredAt: baseTime.toISOString(),
        },
        [user.id],
        { trx, now: baseTime }
      )
    )
    const repository = new PostgresNotificationFanoutRepository()
    const [firstLease] = await repository.claimBatch({
      workerId: 'fanout-before-crash',
      batchSize: 1,
      leaseDurationMs: 1_000,
      now: baseTime,
    })
    if (!firstLease) {
      throw new Error('Expected first fanout lease')
    }

    const reclaimedAt = new Date(baseTime.getTime() + 1_001)
    const [secondLease] = await repository.claimBatch({
      workerId: 'fanout-after-crash',
      batchSize: 1,
      leaseDurationMs: 1_000,
      now: reclaimedAt,
    })
    if (!secondLease) {
      throw new Error('Expected reclaimed fanout lease')
    }

    assert.equal(secondLease.id, firstLease.id)
    assert.notEqual(secondLease.leaseToken, firstLease.leaseToken)
    assert.equal(secondLease.attemptCount, 2)
    assert.isFalse(
      await repository.retry({
        targetId: firstLease.id,
        leaseToken: firstLease.leaseToken,
        errorClass: 'StaleWorker',
        errorMessage: 'must be fenced',
        availableAt: reclaimedAt,
        now: reclaimedAt,
      })
    )
    assert.isTrue(
      await repository.retry({
        targetId: secondLease.id,
        leaseToken: secondLease.leaseToken,
        errorClass: 'TransientFailure',
        errorMessage: 'current lease may retry',
        availableAt: reclaimedAt,
        now: reclaimedAt,
      })
    )
  })
})
