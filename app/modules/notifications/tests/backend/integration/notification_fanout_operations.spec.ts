import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import {
  makeReplayNotificationFanoutCommand,
  makeNotificationFanoutStager,
} from '#composition/notifications/notification-runtime/notification_operations_composition'
import { makeSystemAuditActionContext } from '#modules/audit/public_contracts/audit_action_context'
import { PostgresNotificationFanoutRepository } from '#modules/notifications/infra/repositories/notification-outbox/postgres_notification_fanout_repository'
import { NotificationFanoutWorker } from '#modules/notifications/infra/adapters/notification-outbox/notification_fanout_worker'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory, cleanupTestData } from '#tests/helpers/factories'

const baseTime = new Date('2026-07-23T00:00:00.000Z')

test.group('Integration | Notification Fanout Operations', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('caps operational fanout counts on the health-check read path', async ({ assert }) => {
    const recipients = await Promise.all([
      UserFactory.create({ username: 'fanout_health_cap_1' }),
      UserFactory.create({ username: 'fanout_health_cap_2' }),
    ])
    await db.transaction((trx) =>
      makeNotificationFanoutStager().stage(
        {
          eventName: 'review.operations_health_cap',
          businessEventId: randomUUID(),
          type: 'review_requested',
          schemaVersion: 1,
          scope: { kind: 'system' },
          parameters: { reason: 'operations_health_cap' },
          occurredAt: baseTime.toISOString(),
        },
        recipients.map((recipient) => recipient.id),
        { trx, now: baseTime }
      )
    )

    const repository = new PostgresNotificationFanoutRepository()
    const exact = await repository.operationalStatus(baseTime)
    const bounded = await repository.operationalStatus(baseTime, 1)

    assert.equal(exact.pending, 2)
    assert.equal(bounded.pending, 1)
    assert.equal(bounded.activeJobs, 1)
  })

  test('replays a bounded dead-letter selection and audits the operator action', async ({
    assert,
  }) => {
    const recipient = await UserFactory.create({ username: 'fanout_replay_recipient' })
    const operator = await UserFactory.createSuperadmin()
    const staged = await db.transaction((trx) =>
      makeNotificationFanoutStager().stage(
        {
          eventName: 'review.operations_test',
          businessEventId: randomUUID(),
          type: 'review_requested',
          schemaVersion: 1,
          scope: { kind: 'system' },
          parameters: { reason: 'operations_test' },
          occurredAt: baseTime.toISOString(),
        },
        [recipient.id],
        { trx, now: baseTime }
      )
    )
    const worker = new NotificationFanoutWorker({
      workerId: 'fanout-operations-failure',
      now: () => new Date(baseTime.getTime() + 1_000),
      maxAttempts: 1,
      acceptance: {
        stage: () => Promise.reject(new Error('permanent operations test failure')),
      },
    })
    const failed = await worker.runOnce()
    assert.equal(failed.deadLettered, 1)

    const beforeReplay = await new PostgresNotificationFanoutRepository().operationalStatus(
      new Date(baseTime.getTime() + 2_000)
    )
    assert.equal(beforeReplay.deadLetter, 1)
    assert.equal(beforeReplay.completedWithErrorsJobs, 1)

    const replayed = await makeReplayNotificationFanoutCommand().execute(
      {
        selector: { jobId: staged.jobId },
        reason: 'Operator verified dependency recovery',
        now: new Date(baseTime.getTime() + 2_000),
      },
      makeSystemAuditActionContext(operator.id)
    )

    assert.equal(replayed.affectedCount, 1)
    const replayedTargetId = replayed.targetIds[0]
    if (!replayedTargetId) {
      throw new Error('Expected one replayed fanout target')
    }
    const target = (await db
      .from('notification_fanout_targets')
      .where('id', replayedTargetId)
      .first()) as Record<string, unknown>
    assert.equal(target['status'], 'pending')
    assert.equal(Number(target['attempt_count']), 0)
    assert.isNull(target['last_error_class'])

    const job = (await db
      .from('notification_fanout_jobs')
      .where('id', staged.jobId)
      .first()) as Record<string, unknown>
    assert.equal(job['status'], 'processing')
    assert.equal(Number(job['dead_letter_count']), 0)
    assert.isNull(job['completed_at'])

    const audit = (await db
      .from('audit_events')
      .where('action', 'notification_fanout.replayed')
      .where('user_id', operator.id)
      .first()) as Record<string, unknown> | null
    assert.isNotNull(audit)
  })

  test('rejects fanout replay selectors above the hard cap without partial mutation', async ({
    assert,
  }) => {
    const operator = await UserFactory.createSuperadmin()
    const recipients = await Promise.all(
      Array.from({ length: 101 }, (_, index) =>
        UserFactory.create({ username: `fanout_replay_cap_${String(index)}` })
      )
    )
    const staged = await db.transaction((trx) =>
      makeNotificationFanoutStager().stage(
        {
          eventName: 'review.operations_replay_cap',
          businessEventId: randomUUID(),
          type: 'review_requested',
          schemaVersion: 1,
          scope: { kind: 'system' },
          parameters: { reason: 'operations_replay_cap' },
          occurredAt: baseTime.toISOString(),
        },
        recipients.map((recipient) => recipient.id),
        { trx, now: baseTime }
      )
    )
    await db.from('notification_fanout_targets').where('job_id', staged.jobId).update({
      status: 'dead_letter',
      dead_lettered_at: baseTime,
      last_error_class: 'bulk_dependency_failure',
    })
    await db.from('notification_fanout_jobs').where('id', staged.jobId).update({
      status: 'completed_with_errors',
      dead_letter_count: 101,
      completed_at: baseTime,
    })

    await assert.rejects(
      () =>
        makeReplayNotificationFanoutCommand().execute(
          {
            selector: { jobId: staged.jobId },
            reason: 'Dependency recovery was verified before bounded replay',
            now: new Date(baseTime.getTime() + 1_000),
          },
          makeSystemAuditActionContext(operator.id)
        ),
      /matches more than 100 rows/
    )

    const status = await new PostgresNotificationFanoutRepository().operationalStatus(
      new Date(baseTime.getTime() + 1_000)
    )
    assert.equal(status.deadLetter, 101)
    assert.equal(status.completedWithErrorsJobs, 1)
  })
})
