import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { notificationApplication } from '#composition/notification_composition'
import { makeNotificationFanoutStager } from '#composition/notification_operations_composition'
import type { NotificationFanoutRepository } from '#modules/notifications/actions/ports/outbound/notification_fanout_repository'
import type {
  NotificationFanoutTemplateV1Input,
  NotificationFanoutWorkTarget,
} from '#modules/notifications/domain/notification_fanout'
import { NotificationFanoutConflictError } from '#modules/notifications/domain/notification_fanout_policy'
import { PostgresNotificationFanoutRepository } from '#modules/notifications/infra/repositories/postgres_notification_fanout_repository'
import { NotificationFanoutWorker } from '#modules/notifications/infra/workers/notification_fanout_worker'
import type { PlatformEvent } from '#modules/observability/public_contracts/platform_observability'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory, cleanupTestData } from '#tests/helpers/factories'

const baseTime = new Date('2026-07-23T00:00:00.000Z')

function template(
  organizationId: string,
  overrides: Partial<NotificationFanoutTemplateV1Input> = {}
): NotificationFanoutTemplateV1Input {
  return {
    eventName: 'review.sprint_opened',
    businessEventId: randomUUID(),
    type: 'review_requested',
    schemaVersion: 1,
    scope: { kind: 'organization', id: organizationId },
    actor: { type: 'user', id: randomUUID() },
    subject: { type: 'project_sprint', id: randomUUID() },
    parameters: { reason: 'sprint_review_opened' },
    occurredAt: baseTime.toISOString(),
    correlationId: 'notification-fanout-test',
    ...overrides,
  }
}

async function cleanupFanoutData(): Promise<void> {
  await db.from('notification_fanout_targets').delete()
  await db.from('notification_fanout_jobs').delete()
  await db.from('notification_projection_deliveries').delete()
  await db.from('notification_projection_targets').delete()
  await db.from('notification_outbox').delete()
  await db.from('notification_tombstones').delete()
  await db.from('notification_acceptance_ledger').delete()
  await db.from('notification_recipient_states').delete()
}

async function countRows(table: string): Promise<number> {
  const row = (await db.from(table).count('* as count').first()) as
    | { count?: string | number }
    | undefined
  return Number(row?.count ?? 0)
}

test.group('Integration | Notification Fanout', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(async () => {
    await cleanupFanoutData()
    await cleanupTestData()
  })

  test('snapshots a normalized target set transactionally and retries idempotently', async ({
    assert,
  }) => {
    const firstUser = await UserFactory.create({ username: 'fanout_snapshot_first' })
    const secondUser = await UserFactory.create({ username: 'fanout_snapshot_second' })
    const organizationId = randomUUID()
    const input = template(organizationId)
    const stager = makeNotificationFanoutStager({ maxTargets: 100 })

    const staged = await db.transaction((trx) =>
      stager.stage(input, [secondUser.id, firstUser.id, secondUser.id], {
        trx,
        now: baseTime,
      })
    )
    const retry = await db.transaction((trx) =>
      stager.stage(
        { ...input, correlationId: 'retry-correlation-does-not-change-semantics' },
        [firstUser.id, secondUser.id],
        { trx, now: baseTime }
      )
    )

    assert.equal(staged.status, 'staged')
    assert.equal(retry.status, 'duplicate')
    assert.equal(retry.jobId, staged.jobId)
    assert.equal(staged.targetCount, 2)
    assert.equal(await countRows('notification_fanout_jobs'), 1)
    assert.equal(await countRows('notification_fanout_targets'), 2)
    assert.equal(await countRows('notifications'), 0)
    assert.equal(await countRows('notification_outbox'), 0)

    const targets = (await db
      .from('notification_fanout_targets')
      .select('recipient_id', 'event_id', 'status')
      .orderBy('recipient_id', 'asc')) as Array<{
      recipient_id: string
      event_id: string
      status: string
    }>
    assert.deepEqual(
      targets.map((target) => target.recipient_id),
      [firstUser.id, secondUser.id].sort()
    )
    assert.lengthOf(new Set(targets.map((target) => target.event_id)), 2)
    assert.isTrue(targets.every((target) => target.status === 'pending'))
  })

  test('rolls the job and its entire target snapshot back with the source transaction', async ({
    assert,
  }) => {
    const user = await UserFactory.create({ username: 'fanout_snapshot_rollback' })
    const stager = makeNotificationFanoutStager()
    const trx = await db.transaction()

    try {
      await stager.stage(template(randomUUID()), [user.id], { trx, now: baseTime })
    } finally {
      await trx.rollback()
    }

    assert.equal(await countRows('notification_fanout_jobs'), 0)
    assert.equal(await countRows('notification_fanout_targets'), 0)
  })

  test('rejects a retry whose template or frozen audience changed', async ({ assert }) => {
    const firstUser = await UserFactory.create({ username: 'fanout_conflict_first' })
    const secondUser = await UserFactory.create({ username: 'fanout_conflict_second' })
    const input = template(randomUUID())
    const stager = makeNotificationFanoutStager()

    await db.transaction((trx) => stager.stage(input, [firstUser.id], { trx, now: baseTime }))

    await assert.rejects(
      () =>
        db.transaction((trx) =>
          stager.stage({ ...input, parameters: { reason: 'materially_changed' } }, [firstUser.id], {
            trx,
            now: baseTime,
          })
        ),
      NotificationFanoutConflictError
    )
    await assert.rejects(
      () =>
        db.transaction((trx) =>
          stager.stage(input, [firstUser.id, secondUser.id], {
            trx,
            now: baseTime,
          })
        ),
      NotificationFanoutConflictError
    )

    assert.equal(await countRows('notification_fanout_jobs'), 1)
    assert.equal(await countRows('notification_fanout_targets'), 1)
  })

  test('accepts each leased target and ACKs it in the same transaction', async ({ assert }) => {
    const firstUser = await UserFactory.create({ username: 'fanout_worker_first' })
    const secondUser = await UserFactory.create({ username: 'fanout_worker_second' })
    const stager = makeNotificationFanoutStager()
    const staged = await db.transaction((trx) =>
      stager.stage(template(randomUUID()), [firstUser.id, secondUser.id], {
        trx,
        now: baseTime,
      })
    )
    const worker = new NotificationFanoutWorker({
      workerId: 'fanout-success-worker',
      acceptance: notificationApplication,
      now: () => new Date(baseTime.getTime() + 1_000),
      batchSize: 10,
      concurrency: 2,
    })

    const result = await worker.runOnce()

    assert.deepEqual(result, {
      claimed: 2,
      processed: 2,
      retried: 0,
      deadLettered: 0,
      leaseLost: 0,
    })
    assert.equal(await countRows('notifications'), 2)
    assert.equal(await countRows('notification_acceptance_ledger'), 2)
    assert.equal(await countRows('notification_outbox'), 4)

    const job = (await db
      .from('notification_fanout_jobs')
      .where('id', staged.jobId)
      .first()) as Record<string, unknown>
    assert.equal(job['status'], 'completed')
    assert.equal(Number(job['processed_count']), 2)
    assert.equal(Number(job['dead_letter_count']), 0)
    assert.isNotNull(job['completed_at'])

    const targetStatuses = (await db
      .from('notification_fanout_targets')
      .where('job_id', staged.jobId)
      .select('status', 'notification_id')) as Array<Record<string, unknown>>
    assert.isTrue(
      targetStatuses.every(
        (target) => target['status'] === 'processed' && target['notification_id'] !== null
      )
    )
  })

  test('retries safely, redacts secrets, and dead-letters without partial canonical state', async ({
    assert,
  }) => {
    const user = await UserFactory.create({ username: 'fanout_worker_failure' })
    const stager = makeNotificationFanoutStager()
    await db.transaction((trx) =>
      stager.stage(template(randomUUID()), [user.id], { trx, now: baseTime })
    )
    let clock = new Date(baseTime.getTime() + 1_000)
    const worker = new NotificationFanoutWorker({
      workerId: 'fanout-failure-worker',
      now: () => clock,
      batchSize: 1,
      concurrency: 1,
      maxAttempts: 2,
      retryBaseMs: 100,
      retryCapMs: 100,
      random: () => 0,
      acceptance: {
        stage: () => Promise.reject(new Error('upstream token=top-secret password=hunter2')),
      },
    })

    const first = await worker.runOnce()
    clock = new Date(clock.getTime() + 100)
    const second = await worker.runOnce()

    assert.equal(first.retried, 1)
    assert.equal(second.deadLettered, 1)
    assert.equal(await countRows('notifications'), 0)
    assert.equal(await countRows('notification_acceptance_ledger'), 0)
    assert.equal(await countRows('notification_outbox'), 0)

    const target = (await db.from('notification_fanout_targets').first()) as Record<string, unknown>
    assert.equal(target['status'], 'dead_letter')
    assert.equal(Number(target['attempt_count']), 2)
    assert.notInclude(String(target['last_error_message']), 'top-secret')
    assert.notInclude(String(target['last_error_message']), 'hunter2')

    const job = (await db.from('notification_fanout_jobs').first()) as Record<string, unknown>
    assert.equal(job['status'], 'completed_with_errors')
    assert.equal(Number(job['dead_letter_count']), 1)
  })

  test('observes a fenced fanout target without exposing recipient or command data', async ({
    assert,
  }) => {
    const recipientId = randomUUID()
    const target: NotificationFanoutWorkTarget = {
      id: randomUUID(),
      jobId: randomUUID(),
      sequence: 1,
      eventId: randomUUID(),
      recipientId,
      command: {
        eventId: randomUUID(),
        recipientId,
        type: 'review_requested',
        schemaVersion: 1,
        scope: { kind: 'system' },
        parameters: { reason: 'private-fanout-command-data' },
        occurredAt: baseTime.toISOString(),
      },
      attemptCount: 1,
      leaseToken: randomUUID(),
      lockedUntil: new Date(baseTime.getTime() + 30_000),
    }
    let claimed = false
    const repository: NotificationFanoutRepository = {
      claimBatch: () => {
        if (claimed) return Promise.resolve([])
        claimed = true
        return Promise.resolve([target])
      },
      lockForProcessing: () => Promise.resolve(null),
      markProcessed: () => Promise.resolve(true),
      retry: () => Promise.resolve(true),
      deadLetter: () => Promise.resolve(true),
    }
    const events: PlatformEvent[] = []
    const worker = new NotificationFanoutWorker({
      repository,
      workerId: 'fanout-fencing-observer',
      acceptance: notificationApplication,
      now: () => baseTime,
      operationalLogger: {
        log: (_level, event) => {
          events.push(event)
          throw new Error('telemetry sink unavailable')
        },
      },
    })

    const result = await worker.runOnce()

    assert.equal(result.leaseLost, 1)
    assert.equal(events[0]?.event_name, 'notification.fanout.lease_lost')
    assert.equal(events[0]?.stage, 'lock_rejected')
    assert.isNull(events[0]?.error)
    assert.notInclude(JSON.stringify(events), recipientId)
    assert.notInclude(JSON.stringify(events), 'private-fanout-command-data')
  })

  test('does not claim work when shutdown was already requested', async ({ assert }) => {
    const user = await UserFactory.create({ username: 'fanout_preaborted' })
    const staged = await db.transaction((trx) =>
      makeNotificationFanoutStager().stage(template(randomUUID()), [user.id], {
        trx,
        now: baseTime,
      })
    )
    const shutdownController = new AbortController()
    shutdownController.abort()
    const worker = new NotificationFanoutWorker({
      workerId: 'fanout-preaborted-worker',
      acceptance: notificationApplication,
      now: () => new Date(baseTime.getTime() + 1_000),
    })

    const result = await worker.runOnce({ signal: shutdownController.signal })

    assert.deepEqual(result, {
      claimed: 0,
      processed: 0,
      retried: 0,
      deadLettered: 0,
      leaseLost: 0,
    })
    const target = (await db
      .from('notification_fanout_targets')
      .where('job_id', staged.jobId)
      .first()) as Record<string, unknown>
    assert.equal(target['status'], 'pending')
    assert.equal(Number(target['attempt_count']), 0)
  })

  test('rolls canonical acceptance back on shutdown and reclaims it idempotently after lease expiry', async ({
    assert,
  }) => {
    const user = await UserFactory.create({ username: 'fanout_shutdown_reclaim' })
    const staged = await db.transaction((trx) =>
      makeNotificationFanoutStager().stage(template(randomUUID()), [user.id], {
        trx,
        now: baseTime,
      })
    )
    const shutdownController = new AbortController()
    const canonicalAcceptance = notificationApplication
    const interruptedWorker = new NotificationFanoutWorker({
      workerId: 'fanout-interrupted-worker',
      now: () => new Date(baseTime.getTime() + 1_000),
      acceptance: {
        stage: async (command, options) => {
          const accepted = await canonicalAcceptance.stage(command, options)
          shutdownController.abort()
          return accepted
        },
      },
    })

    const interrupted = await interruptedWorker.runOnce({
      signal: shutdownController.signal,
    })

    assert.deepEqual(interrupted, {
      claimed: 1,
      processed: 0,
      retried: 0,
      deadLettered: 0,
      leaseLost: 0,
      aborted: 1,
    })
    assert.equal(await countRows('notifications'), 0)
    assert.equal(await countRows('notification_acceptance_ledger'), 0)
    assert.equal(await countRows('notification_outbox'), 0)
    const leased = (await db
      .from('notification_fanout_targets')
      .where('job_id', staged.jobId)
      .first()) as Record<string, unknown>
    assert.equal(leased['status'], 'leased')
    assert.equal(Number(leased['attempt_count']), 1)

    const recoveryWorker = new NotificationFanoutWorker({
      workerId: 'fanout-recovery-worker',
      acceptance: notificationApplication,
      now: () => new Date(baseTime.getTime() + 31_001),
    })
    const recovered = await recoveryWorker.runOnce()

    assert.equal(recovered.processed, 1)
    assert.equal(await countRows('notifications'), 1)
    assert.equal(await countRows('notification_acceptance_ledger'), 1)
    assert.equal(await countRows('notification_outbox'), 2)
    const processed = (await db
      .from('notification_fanout_targets')
      .where('job_id', staged.jobId)
      .first()) as Record<string, unknown>
    assert.equal(processed['status'], 'processed')
    assert.equal(Number(processed['attempt_count']), 2)
  })

  test('does not initiate retry or dead-letter persistence after shutdown', async ({ assert }) => {
    for (const scenario of [
      { name: 'retry', attemptCount: 1, maxAttempts: 2 },
      { name: 'dead-letter', attemptCount: 1, maxAttempts: 1 },
    ] as const) {
      const targetId = randomUUID()
      const recipientId = randomUUID()
      const target: NotificationFanoutWorkTarget = {
        id: targetId,
        jobId: randomUUID(),
        sequence: 1,
        eventId: randomUUID(),
        recipientId,
        command: {
          eventId: randomUUID(),
          recipientId,
          type: 'review_requested',
          schemaVersion: 1,
          scope: { kind: 'system' },
          parameters: { reason: 'shutdown_failure_fencing' },
          occurredAt: baseTime.toISOString(),
        },
        attemptCount: scenario.attemptCount,
        leaseToken: randomUUID(),
        lockedUntil: new Date(baseTime.getTime() + 30_000),
      }
      let retryCalls = 0
      let deadLetterCalls = 0
      const repository: NotificationFanoutRepository = {
        claimBatch: () => Promise.resolve([target]),
        lockForProcessing: () => Promise.resolve(target),
        markProcessed: () => Promise.resolve(true),
        retry: () => {
          retryCalls += 1
          return Promise.resolve(true)
        },
        deadLetter: () => {
          deadLetterCalls += 1
          return Promise.resolve(true)
        },
      }
      const shutdownController = new AbortController()
      const worker = new NotificationFanoutWorker({
        repository,
        workerId: `fanout-shutdown-${scenario.name}`,
        now: () => baseTime,
        maxAttempts: scenario.maxAttempts,
        acceptance: {
          stage: () => {
            shutdownController.abort()
            return Promise.reject(new Error('dependency failed while shutdown began'))
          },
        },
      })

      const result = await worker.runOnce({ signal: shutdownController.signal })

      assert.equal(result.aborted, 1)
      assert.equal(result.retried, 0)
      assert.equal(result.deadLettered, 0)
      assert.equal(retryCalls, 0)
      assert.equal(deadLetterCalls, 0)
    }
  })

  test('isolates retry and dead-letter persistence failures while sibling targets complete', async ({
    assert,
  }) => {
    const retryUser = await UserFactory.create({ username: 'fanout_retry_persistence_failure' })
    const deadLetterUser = await UserFactory.create({
      username: 'fanout_deadletter_persistence_failure',
    })
    const successUser = await UserFactory.create({ username: 'fanout_persistence_sibling_success' })
    const staged = await db.transaction((trx) =>
      makeNotificationFanoutStager().stage(
        template(randomUUID()),
        [retryUser.id, deadLetterUser.id, successUser.id],
        { trx, now: baseTime }
      )
    )
    const targetRows = (await db
      .from('notification_fanout_targets')
      .where('job_id', staged.jobId)
      .select('id', 'recipient_id')) as Array<{ id: string; recipient_id: string }>
    const retryTargetId = targetRows.find((row) => row.recipient_id === retryUser.id)?.id
    const deadLetterTargetId = targetRows.find((row) => row.recipient_id === deadLetterUser.id)?.id
    if (!retryTargetId || !deadLetterTargetId) {
      throw new Error('Expected retry and dead-letter fanout targets')
    }
    await db
      .from('notification_fanout_targets')
      .where('id', deadLetterTargetId)
      .update({ attempt_count: 1 })

    const canonicalRepository = new PostgresNotificationFanoutRepository()
    const canonicalAcceptance = notificationApplication
    const repository: NotificationFanoutRepository = {
      claimBatch: (input) => canonicalRepository.claimBatch(input),
      lockForProcessing: (input, trx) => canonicalRepository.lockForProcessing(input, trx),
      markProcessed: (input, trx) => canonicalRepository.markProcessed(input, trx),
      retry: (input) => {
        if (input.targetId === retryTargetId) {
          return Promise.reject(new Error('retry persistence unavailable'))
        }
        return canonicalRepository.retry(input)
      },
      deadLetter: (input) => {
        if (input.targetId === deadLetterTargetId) {
          return Promise.reject(new Error('dead-letter persistence unavailable'))
        }
        return canonicalRepository.deadLetter(input)
      },
    }
    const events: PlatformEvent[] = []
    const worker = new NotificationFanoutWorker({
      repository,
      workerId: 'fanout-persistence-isolation-worker',
      now: () => new Date(baseTime.getTime() + 1_000),
      concurrency: 3,
      maxAttempts: 2,
      acceptance: {
        stage: (command, options) =>
          command.recipientId === successUser.id
            ? canonicalAcceptance.stage(command, options)
            : Promise.reject(new Error('dependency unavailable')),
      },
      operationalLogger: {
        log: (_level, event) => {
          events.push(event)
        },
      },
    })

    const result = await worker.runOnce()

    assert.deepEqual(result, {
      claimed: 3,
      processed: 1,
      retried: 0,
      deadLettered: 0,
      leaseLost: 2,
    })
    assert.equal(await countRows('notifications'), 1)
    assert.includeMembers(
      events.map((event) => event.stage),
      ['retry_failed', 'dead_letter_failed']
    )
    const states = (await db
      .from('notification_fanout_targets')
      .where('job_id', staged.jobId)
      .select('recipient_id', 'status')) as Array<{ recipient_id: string; status: string }>
    assert.equal(states.find((row) => row.recipient_id === successUser.id)?.status, 'processed')
    assert.equal(states.find((row) => row.recipient_id === retryUser.id)?.status, 'leased')
    assert.equal(states.find((row) => row.recipient_id === deadLetterUser.id)?.status, 'leased')
  })
})
