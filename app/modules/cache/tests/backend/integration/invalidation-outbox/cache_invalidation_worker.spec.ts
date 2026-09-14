import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import {
  baseTime,
  clearOutbox,
  installSchema,
  outboxRow,
  seedOutbox,
  uninstallSchema,
} from './support/cache_invalidation_outbox_test_fixtures.js'

import { replayCacheInvalidationOutboxCommand } from '#composition/cache/invalidation-outbox/cache_invalidation_replay_composition'
import { CacheInvalidationOutboxWorker } from '#modules/cache/infra/adapters/invalidation-outbox/cache_invalidation_outbox_worker'
import { PostgresCacheInvalidationOutboxRepository } from '#modules/cache/infra/repositories/invalidation-outbox/postgres_cache_invalidation_outbox_repository'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, UserFactory } from '#tests/helpers/factories'


test.group('Integration | Cache invalidation transactional outbox worker', (group) => {
  group.setup(async () => {
    await setupApp()
    await installSchema()
  })

  group.teardown(async () => {
    await uninstallSchema()
    await teardownApp()
  })

  group.each.teardown(async () => {
    await cleanupTestData()
    await clearOutbox()
  })

  test('concurrent workers claim disjoint bounded batches', async ({ assert }) => {
    const ids = await Promise.all(Array.from({ length: 6 }, () => seedOutbox(['tasks:list:*'])))
    const repository = new PostgresCacheInvalidationOutboxRepository()

    const [first, second] = await Promise.all([
      repository.claimBatch({
        workerId: 'cache-worker-a',
        batchSize: 3,
        leaseDurationMs: 60_000,
        now: baseTime,
      }),
      repository.claimBatch({
        workerId: 'cache-worker-b',
        batchSize: 3,
        leaseDurationMs: 60_000,
        now: baseTime,
      }),
    ])

    const claimedIds = [...first, ...second].map((job) => job.id)
    assert.lengthOf(first, 3)
    assert.lengthOf(second, 3)
    assert.lengthOf(new Set(claimedIds), 6)
    assert.sameMembers(claimedIds, ids)
    assert.isTrue([...first, ...second].every((job) => job.attemptCount === 1))
  })

  test('expired leases are reclaimed and stale workers are fenced', async ({ assert }) => {
    const id = await seedOutbox(['tasks:list:*'])
    const repository = new PostgresCacheInvalidationOutboxRepository()
    const [firstLease] = await repository.claimBatch({
      workerId: 'cache-worker-before-crash',
      batchSize: 1,
      leaseDurationMs: 60_000,
      now: baseTime,
    })
    if (!firstLease) {
      throw new Error('Expected first cache invalidation lease')
    }

    const reclaimedAt = new Date(baseTime.getTime() + 61_000)
    const [secondLease] = await repository.claimBatch({
      workerId: 'cache-worker-after-crash',
      batchSize: 1,
      leaseDurationMs: 60_000,
      now: reclaimedAt,
    })
    if (!secondLease) {
      throw new Error('Expected reclaimed cache invalidation lease')
    }

    assert.equal(secondLease.id, id)
    assert.notEqual(secondLease.leaseToken, firstLease.leaseToken)
    assert.equal(secondLease.attemptCount, 2)
    assert.isFalse(
      await repository.acknowledge({
        jobId: id,
        leaseToken: firstLease.leaseToken,
        now: reclaimedAt,
      })
    )
    assert.isTrue(
      await repository.acknowledge({
        jobId: id,
        leaseToken: secondLease.leaseToken,
        now: reclaimedAt,
      })
    )
    const processedRow = await outboxRow(id)
    assert.equal(processedRow['status'], 'processed')
  })

  test('a new worker process resumes a persisted retry and ACKs exactly once', async ({
    assert,
  }) => {
    const id = await seedOutbox(['tasks:list:*'])
    const repository = new PostgresCacheInvalidationOutboxRepository()
    const firstWorker = new CacheInvalidationOutboxWorker({
      repository,
      invalidator: {
        deleteByPattern: () => Promise.reject(new Error('redis temporarily unavailable')),
      },
      workerId: 'cache-worker-process-one',
      now: () => baseTime,
      random: () => 0.5,
      retryBaseMs: 1_000,
    })

    const failedRun = await firstWorker.runOnce()
    assert.equal(failedRun.retried, 1)
    const retryRow = await outboxRow(id)
    assert.equal(retryRow['status'], 'pending')
    assert.equal(new Date(String(retryRow['available_at'])).getTime(), baseTime.getTime() + 1_000)

    let deletionCalls = 0
    const secondWorker = new CacheInvalidationOutboxWorker({
      repository,
      invalidator: {
        deleteByPattern: () => {
          deletionCalls += 1
          return Promise.resolve()
        },
      },
      workerId: 'cache-worker-process-two',
      now: () => new Date(baseTime.getTime() + 1_000),
    })
    const successfulRun = await secondWorker.runOnce()
    const emptyRun = await secondWorker.runOnce()

    assert.equal(successfulRun.processed, 1)
    assert.equal(emptyRun.claimed, 0)
    assert.equal(deletionCalls, 1)
    const processedRow = await outboxRow(id)
    assert.equal(processedRow['status'], 'processed')
  })

  test('reports backlog and purges only old processed rows in bounded batches', async ({
    assert,
  }) => {
    const pendingId = await seedOutbox(['tasks:list:*'])
    const oldProcessedId = await seedOutbox(['tasks:public:*'])
    const recentProcessedId = await seedOutbox(['task:metadata:*'])
    await db
      .from('cache_invalidation_outbox')
      .where('id', oldProcessedId)
      .update({
        status: 'processed',
        processed_at: new Date('2026-07-20T00:00:00.000Z'),
      })
    await db
      .from('cache_invalidation_outbox')
      .where('id', recentProcessedId)
      .update({
        status: 'processed',
        processed_at: new Date('2026-07-23T00:00:00.000Z'),
      })
    const repository = new PostgresCacheInvalidationOutboxRepository()

    const backlog = await repository.backlog()
    const purged = await repository.purgeProcessedBefore(new Date('2026-07-22T00:00:00.000Z'), 1)

    assert.isTrue(backlog.configured)
    assert.equal(backlog.pending, 1)
    assert.equal(backlog.deadLetter, 0)
    assert.equal(purged, 1)
    assert.exists(await db.from('cache_invalidation_outbox').where('id', pendingId).first())
    assert.notExists(await db.from('cache_invalidation_outbox').where('id', oldProcessedId).first())
    assert.exists(await db.from('cache_invalidation_outbox').where('id', recentProcessedId).first())
  })

  test('reports retry, lease, processed, dead-letter, and oldest-pending status', async ({
    assert,
  }) => {
    const pendingId = await seedOutbox(['tasks:list:*'], { attemptCount: 2 })
    const leasedId = await seedOutbox(['task:audit:*'])
    const processedId = await seedOutbox(['tasks:public:*'])
    const deadLetterId = await seedOutbox(['task:metadata:*'])
    await db
      .from('cache_invalidation_outbox')
      .where('id', pendingId)
      .update({ created_at: baseTime })
    await db
      .from('cache_invalidation_outbox')
      .where('id', leasedId)
      .update({
        status: 'leased',
        locked_by: 'status-test-worker',
        locked_until: new Date(baseTime.getTime() + 60_000),
        lease_token: randomUUID(),
      })
    await db
      .from('cache_invalidation_outbox')
      .where('id', processedId)
      .update({ status: 'processed', processed_at: baseTime })
    await db.from('cache_invalidation_outbox').where('id', deadLetterId).update({
      status: 'dead_letter',
      dead_lettered_at: baseTime,
      last_error_class: 'RedisTimeoutError',
    })
    const repository = new PostgresCacheInvalidationOutboxRepository()

    const status = await repository.operationalStatus(new Date(baseTime.getTime() + 5 * 60_000))

    assert.deepEqual(status, {
      configured: true,
      pending: 1,
      leased: 1,
      retryPending: 1,
      deadLetter: 1,
      processed: 1,
      oldestPendingAgeMs: 5 * 60_000,
    })
  })

  test('replays reviewed dead letters atomically with immutable operator audit', async ({
    assert,
  }) => {
    const actor = await UserFactory.createSuperadmin()
    await clearOutbox()
    const id = await seedOutbox(['tasks:list:*'], { attemptCount: 10 })
    await db.from('cache_invalidation_outbox').where('id', id).update({
      status: 'dead_letter',
      dead_lettered_at: baseTime,
      last_error_class: 'RedisTimeoutError',
      last_error_message: 'redacted outage',
    })
    const replayedAt = new Date(baseTime.getTime() + 60_000)

    const result = await replayCacheInvalidationOutboxCommand.execute(
      {
        selector: {
          ids: [id],
          errorClass: 'RedisTimeoutError',
        },
        reason: 'Redis recovered and this dead letter was reviewed.',
        now: replayedAt,
      },
      {
        userId: actor.id,
        ip: '127.0.0.1',
        userAgent: 'cache-invalidation-outbox-integration-test',
        organizationId: null,
        actorRoleSurface: actor.system_role,
        requestId: 'cache-replay-test',
        traceId: null,
        workflowId: 'cache_invalidation_outbox_replay',
      }
    )

    assert.deepEqual(result, { affectedCount: 1, outboxIds: [id] })
    const replayed = await outboxRow(id)
    assert.equal(replayed['status'], 'pending')
    assert.equal(replayed['attempt_count'], 0)
    assert.equal(new Date(String(replayed['available_at'])).getTime(), replayedAt.getTime())
    assert.isNull(replayed['dead_lettered_at'])
    assert.isNull(replayed['last_error_class'])
    assert.isNull(replayed['last_error_message'])

    const audit = (await db
      .from('audit_events')
      .where('event_name', 'cache.invalidation_outbox.replayed')
      .where('entity_id', id)
      .first()) as
      | {
          user_id: string
          action: string
          retention_class: string
          event_hash: string
          new_values: Record<string, unknown>
        }
      | undefined
    assert.exists(audit)
    assert.equal(audit?.user_id, actor.id)
    assert.equal(audit?.action, 'cache_invalidation_outbox.replayed')
    assert.equal(audit?.retention_class, 'security')
    assert.match(audit?.event_hash ?? '', /^[0-9a-f]{64}$/)
    assert.equal(audit?.new_values['reason'], 'Redis recovered and this dead letter was reviewed.')
    assert.equal(audit?.new_values['previousStatus'], 'dead_letter')
    assert.equal(audit?.new_values['resultingStatus'], 'pending')
  })
})
