import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { notificationApplication as notificationPublicApi } from '#composition/notifications/notification-feed/notification_composition'
import { makePurgeNotificationRetentionCommand } from '#composition/notifications/notification-feed/notification_projection_composition'
import { resolveNotificationRetentionServicePrincipal } from '#modules/authorization/public_contracts/notification_retention_service_principal'
import { PurgeNotificationRetentionCommand } from '#modules/notifications/actions/commands/notification-outbox/purge_notification_retention_command'
import type { NotificationCommandV1Input } from '#modules/notifications/domain/notification-feed/notification_command'
import { PostgresNotificationOutboxRepository } from '#modules/notifications/infra/repositories/notification-outbox/postgres_notification_outbox_repository'
import { PostgresNotificationRetentionRepository } from '#modules/notifications/infra/repositories/notification-outbox/postgres_notification_retention_repository'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory, cleanupTestData } from '#tests/helpers/factories'

const now = new Date('2026-07-23T12:00:00.000Z')
const DAY_MS = 24 * 60 * 60 * 1_000
const retentionActorId = '019c0028-2ddc-7d42-96e8-918675f98c31'

async function retentionRunInput() {
  const operatorIdentity = await resolveNotificationRetentionServicePrincipal(retentionActorId, {
    findPrincipal: () =>
      Promise.resolve({
        id: retentionActorId,
        systemRole: 'system_admin',
        status: 'active',
      }),
    hasPermission: () => Promise.resolve(true),
  })
  return {
    now,
    batchSize: 100,
    reason: 'scheduled notification privacy retention',
    confirmation: 'PURGE',
    execution: { userId: retentionActorId, operatorIdentity },
  }
}

function commandFor(recipientId: string): NotificationCommandV1Input {
  return {
    eventId: randomUUID(),
    type: 'task_assigned',
    schemaVersion: 1,
    recipientId,
    scope: { kind: 'user', id: recipientId },
    actor: { type: 'user', id: randomUUID() },
    subject: { type: 'task', id: randomUUID() },
    parameters: { taskTitle: 'Retention policy test' },
    occurredAt: new Date(now.getTime() - DAY_MS).toISOString(),
  }
}

test.group('Integration | Notification Retention', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(async () => {
    await teardownApp()
  })
  group.each.teardown(() => cleanupTestData())

  test('freezes the catalog retention class and deadline at acceptance', async ({ assert }) => {
    const user = await UserFactory.create({ username: 'notification_retention_snapshot' })
    const command = commandFor(user.id)
    const accepted = await notificationPublicApi.accept(command)

    const row = (await db
      .from('notifications')
      .select('retention_class', 'retention_until')
      .where('id', accepted.notificationId)
      .first()) as { retention_class: string; retention_until: Date }

    assert.equal(row.retention_class, 'notification_standard_180d')
    assert.equal(
      new Date(row.retention_until).getTime(),
      new Date(command.occurredAt).getTime() + 180 * DAY_MS
    )
  })

  test('caps operational outbox counts on the health-check read path', async ({ assert }) => {
    const user = await UserFactory.create({ username: 'notification_health_count_cap' })
    await notificationPublicApi.accept(commandFor(user.id))

    const repository = new PostgresNotificationOutboxRepository()
    const exact = await repository.operationalStatus(now)
    const bounded = await repository.operationalStatus(now, 1)

    assert.equal(exact.pending, 2)
    assert.equal(bounded.pending, 1)
    assert.isAtMost(bounded.processed, 1)
  })

  test('expires canonical content through the revisioned tombstone workflow', async ({
    assert,
  }) => {
    const user = await UserFactory.create({ username: 'notification_retention_expire' })
    const accepted = await notificationPublicApi.accept(commandFor(user.id))
    await db
      .from('notifications')
      .where('id', accepted.notificationId)
      .update({ retention_until: new Date(now.getTime() - 1) })

    const result = await makePurgeNotificationRetentionCommand().execute(await retentionRunInput())

    assert.equal(result.expiredNotifications, 1)
    assert.isNull(await db.from('notifications').where('id', accepted.notificationId).first())

    const tombstone = (await db
      .from('notification_tombstones')
      .where('notification_id', accepted.notificationId)
      .first()) as Record<string, unknown>
    assert.equal(Number(tombstone['final_revision']), 2)

    const ledger = (await db
      .from('notification_acceptance_ledger')
      .where('notification_id', accepted.notificationId)
      .first()) as Record<string, unknown>
    assert.equal(ledger['terminal_state'], 'deleted')

    const state = (await db
      .from('notification_recipient_states')
      .where('recipient_id', user.id)
      .first()) as Record<string, unknown>
    assert.equal(Number(state['unread_count']), 0)
    assert.equal(Number(state['revision']), 2)

    const tombstoneJob = (await db
      .from('notification_outbox')
      .where('notification_id', accepted.notificationId)
      .where('event_kind', 'notification_tombstone')
      .first()) as Record<string, unknown> | undefined
    assert.isNotNull(tombstoneJob)
  })

  test('purges only replay-safe processed outbox rows and successful fanout jobs', async ({
    assert,
  }) => {
    const user = await UserFactory.create({ username: 'notification_retention_maintenance' })
    const accepted = await notificationPublicApi.accept(commandFor(user.id))
    const old = new Date(now.getTime() - 31 * DAY_MS)

    const feedJob = (await db
      .from('notification_outbox')
      .where('notification_id', accepted.notificationId)
      .first()) as { id: string }
    await db.from('notification_outbox').where('id', feedJob.id).update({
      status: 'processed',
      processed_at: old,
      updated_at: old,
    })
    const projectionTargetId = randomUUID()
    await db.table('notification_projection_targets').insert({
      id: projectionTargetId,
      target_key: `retention-${projectionTargetId}`,
      physical_index: `retention-${projectionTargetId}`,
      status: 'primary',
      active_from_sequence: 0,
      checkpoint_sequence: 0,
      reconciliation_status: 'passed',
      reconciled_at: old,
      created_at: old,
      updated_at: old,
    })
    await db.table('notification_projection_deliveries').insert({
      outbox_id: feedJob.id,
      target_id: projectionTargetId,
      status: 'processed',
      attempt_count: 1,
      applied_revision: 1,
      processed_at: old,
      created_at: old,
      updated_at: old,
    })

    const pendingJob = (await db.from('notification_outbox').whereNot('id', feedJob.id).first()) as
      | { id: string }
      | undefined
    if (!pendingJob) {
      throw new Error('Expected an unread pending job')
    }

    const completedJobId = randomUUID()
    const errorJobId = randomUUID()
    await db.table('notification_fanout_jobs').insert([
      {
        id: completedJobId,
        source_event_name: 'retention.completed',
        business_event_id: randomUUID(),
        template_fingerprint: 'a'.repeat(64),
        target_fingerprint: 'b'.repeat(64),
        notification_type: 'task_assigned',
        schema_version: 1,
        scope_type: 'system',
        parameters: {},
        occurred_at: old,
        status: 'completed',
        target_count: 1,
        processed_count: 1,
        dead_letter_count: 0,
        created_at: old,
        updated_at: old,
        completed_at: old,
      },
      {
        id: errorJobId,
        source_event_name: 'retention.error',
        business_event_id: randomUUID(),
        template_fingerprint: 'c'.repeat(64),
        target_fingerprint: 'd'.repeat(64),
        notification_type: 'task_assigned',
        schema_version: 1,
        scope_type: 'system',
        parameters: {},
        occurred_at: old,
        status: 'completed_with_errors',
        target_count: 1,
        processed_count: 0,
        dead_letter_count: 1,
        created_at: old,
        updated_at: old,
        completed_at: old,
      },
    ])
    await db.table('notification_fanout_targets').insert([
      {
        id: randomUUID(),
        job_id: completedJobId,
        recipient_id: user.id,
        event_id: randomUUID(),
        status: 'processed',
        attempt_count: 1,
        notification_id: accepted.notificationId,
        processed_at: old,
        created_at: old,
        updated_at: old,
      },
      {
        id: randomUUID(),
        job_id: errorJobId,
        recipient_id: user.id,
        event_id: randomUUID(),
        status: 'dead_letter',
        attempt_count: 10,
        dead_lettered_at: old,
        last_error_class: 'PermanentFailure',
        last_error_message: 'sanitized',
        created_at: old,
        updated_at: old,
      },
    ])

    const result = await makePurgeNotificationRetentionCommand().execute(await retentionRunInput())

    assert.equal(result.purgedProcessedOutbox, 1)
    assert.equal(result.purgedCompletedFanoutJobs, 1)
    assert.equal(result.purgedTombstones, 0)
    assert.isNull(await db.from('notification_outbox').where('id', feedJob.id).first())
    assert.isNotNull(await db.from('notification_outbox').where('id', pendingJob.id).first())
    assert.isNull(await db.from('notification_fanout_jobs').where('id', completedJobId).first())
    assert.isNotNull(await db.from('notification_fanout_jobs').where('id', errorJobId).first())
  })

  test('retires an expired rollback target before deleting its alias-free physical index', async ({
    assert,
  }) => {
    const targetId = randomUUID()
    const physicalIndex = `suar_notifications_feed_${targetId}`
    await db.table('notification_projection_targets').insert({
      id: targetId,
      target_key: `retirement-${targetId}`,
      physical_index: physicalIndex,
      status: 'rollback',
      active_from_sequence: 0,
      required_until: new Date(now.getTime() - 1),
      checkpoint_sequence: 0,
      reconciliation_status: 'passed',
      reconciled_at: new Date(now.getTime() - 2 * DAY_MS),
      rollback_eligible: true,
      created_at: new Date(now.getTime() - 2 * DAY_MS),
      updated_at: new Date(now.getTime() - 2 * DAY_MS),
    })

    const deletedIndices: string[] = []
    const command = new PurgeNotificationRetentionCommand(
      new PostgresNotificationRetentionRepository(),
      {
        purgeMany: (_index, ids) => Promise.resolve({ appliedIds: ids, failures: [] }),
      },
      {
        aliasIndices: () => Promise.resolve([]),
        deletePhysicalIndex: (index) => {
          deletedIndices.push(index)
          return Promise.resolve()
        },
      }
    )

    const retirement = await command.execute(await retentionRunInput())
    assert.equal(retirement.retiredProjectionTargets, 1)
    assert.equal(retirement.purgedRetiredProjectionIndices, 0)
    assert.deepEqual(deletedIndices, [])

    await db
      .from('notification_projection_targets')
      .where('id', targetId)
      .update({ retired_at: new Date(now.getTime() - 2 * DAY_MS) })
    const deletion = await command.execute(await retentionRunInput())

    assert.equal(deletion.purgedRetiredProjectionIndices, 1)
    assert.deepEqual(deletedIndices, [physicalIndex])
    const row = (await db
      .from('notification_projection_targets')
      .select('status', 'physical_deleted_at')
      .where('id', targetId)
      .first()) as { status: string; physical_deleted_at: Date | null }
    assert.equal(row.status, 'retired')
    assert.isNotNull(row.physical_deleted_at)
  })
})
