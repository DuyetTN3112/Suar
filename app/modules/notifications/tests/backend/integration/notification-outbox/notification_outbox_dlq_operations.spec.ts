import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import {
  makeDiscardNotificationOutboxDeadLettersCommand,
  makePreviewNotificationOutboxDeadLettersQuery,
  makeReplayNotificationOutboxCommand,
} from '#composition/notifications/notification-runtime/notification_operations_composition'
import { makeSystemAuditActionContext } from '#modules/audit/public_contracts/audit_action_context'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { PostgresNotificationRetentionRepository } from '#modules/notifications/infra/repositories/notification-outbox/postgres_notification_retention_repository'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory, cleanupTestData } from '#tests/helpers/factories'

const operationTime = new Date('2026-07-24T00:00:00.000Z')

async function seedDeadLetter(
  recipientId: string,
  errorClass: string
): Promise<{ id: string; sequence: number }> {
  const id = randomUUID()
  const notificationId = randomUUID()
  const inserted = (await db
    .table('notification_outbox')
    .insert({
      id,
      notification_id: notificationId,
      operation_id: randomUUID(),
      source_event_id: randomUUID(),
      event_kind: 'notification_upsert',
      revision: 1,
      projection_revision: 1,
      destination: 'feed_search',
      partition_key: notificationId,
      recipient_id: recipientId,
      recipient_state_revision: 1,
      payload: {
        notificationId,
        recipientId,
        revision: 1,
      },
      status: 'dead_letter',
      attempt_count: 10,
      available_at: operationTime,
      dead_lettered_at: operationTime,
      last_error_class: errorClass,
      last_error_message: 'sanitized failure',
    })
    .returning(['sequence'])) as Array<{ sequence: number | string }>

  return { id, sequence: Number(inserted[0]?.sequence) }
}

test.group('Integration | Notification Outbox DLQ Operations', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('lists only bounded sanitized metadata with stable sequence pagination', async ({
    assert,
  }) => {
    const operator = await UserFactory.create({ username: 'notification_dlq_list_operator' })
    const first = await seedDeadLetter(operator.id, 'mapping_rejected')
    const second = await seedDeadLetter(operator.id, 'mapping_rejected')
    await seedDeadLetter(operator.id, 'other_failure')
    const query = makePreviewNotificationOutboxDeadLettersQuery()

    const page = await query.execute(
      {
        selector: { errorClass: 'mapping_rejected' },
        limit: 1,
      },
      makeSystemAuditActionContext(operator.id)
    )

    assert.lengthOf(page.items, 1)
    assert.equal(page.items[0]?.id, first.id)
    assert.equal(page.items[0]?.sequence, first.sequence)
    assert.equal(page.items[0]?.errorClass, 'mapping_rejected')
    assert.notProperty(page.items[0] ?? {}, 'payload')
    assert.notProperty(page.items[0] ?? {}, 'errorMessage')
    assert.notProperty(page.items[0] ?? {}, 'recipientId')
    assert.isTrue(page.hasMore)
    assert.equal(page.nextAfterSequence, first.sequence)
    const nextAfterSequence = page.nextAfterSequence
    if (nextAfterSequence === null) {
      throw new Error('Expected a continuation sequence')
    }

    const nextPage = await query.execute(
      {
        selector: { errorClass: 'mapping_rejected' },
        afterSequence: nextAfterSequence,
        limit: 1,
      },
      makeSystemAuditActionContext(operator.id)
    )
    assert.deepEqual(
      nextPage.items.map((item) => item.id),
      [second.id]
    )
    assert.isFalse(nextPage.hasMore)
  })

  test('rejects replay selectors matching more than the hard administrative cap atomically', async ({
    assert,
  }) => {
    const operator = await UserFactory.create({ username: 'notification_dlq_cap_operator' })
    await Promise.all(
      Array.from({ length: 101 }, () => seedDeadLetter(operator.id, 'bulk_mapping_rejected'))
    )
    const command = makeReplayNotificationOutboxCommand()

    await assert.rejects(
      () =>
        command.execute(
          {
            selector: { errorClass: 'bulk_mapping_rejected' },
            reason: 'Mapping fix was deployed and verified in the target environment',
            now: operationTime,
          },
          makeSystemAuditActionContext(operator.id)
        ),
      /matches more than 100 rows/
    )

    const remaining = (await db
      .from('notification_outbox')
      .where('status', 'dead_letter')
      .where('last_error_class', 'bulk_mapping_rejected')
      .count('* as total')
      .first()) as { total: number | string } | undefined
    assert.equal(Number(remaining?.['total'] ?? 0), 101)
  })

  test('terminally discards explicit irreparable poison rows with immutable audit evidence', async ({
    assert,
  }) => {
    const operator = await UserFactory.create({ username: 'notification_dlq_dispose_operator' })
    const poison = await seedDeadLetter(operator.id, 'invalid_contract')
    const untouched = await seedDeadLetter(operator.id, 'invalid_contract')
    const command = makeDiscardNotificationOutboxDeadLettersCommand()

    const result = await command.execute(
      {
        ids: [poison.id],
        reason: 'Source contract is irreparable and business owner approved terminal discard',
        confirmation: 'DISCARD',
        now: operationTime,
      },
      makeSystemAuditActionContext(operator.id)
    )

    assert.deepEqual(result.outboxIds, [poison.id])
    const discarded = (await db.from('notification_outbox').where('id', poison.id).first()) as
      | {
          status: string
          disposed_by: string | null
          disposition_reason: string | null
        }
      | undefined
    assert.equal(discarded?.['status'], 'discarded')
    assert.equal(discarded?.['disposed_by'], operator.id)
    assert.equal(
      discarded?.['disposition_reason'],
      'Source contract is irreparable and business owner approved terminal discard'
    )
    const untouchedRow = (await db
      .from('notification_outbox')
      .where('id', untouched.id)
      .first()) as { status: string } | undefined
    assert.equal(untouchedRow?.status, 'dead_letter')

    const audit = (await db
      .from('audit_events')
      .where('action', 'notification_outbox.discarded')
      .where('entity_id', poison.id)
      .first()) as { id: string } | undefined
    assert.exists(audit)

    const replayed = await makeReplayNotificationOutboxCommand().execute(
      {
        selector: { ids: [poison.id] },
        reason: 'Verify terminal disposition cannot be replayed accidentally',
        now: new Date(operationTime.getTime() + 1_000),
      },
      makeSystemAuditActionContext(operator.id)
    )
    assert.equal(replayed.affectedCount, 0)

    const purged = await new PostgresNotificationRetentionRepository().purgeProcessedOutbox(
      new Date(operationTime.getTime() + 31 * 24 * 60 * 60 * 1_000),
      100
    )
    assert.equal(purged, 1)
    assert.isNull(await db.from('notification_outbox').where('id', poison.id).first())
    assert.exists(
      await db
        .from('audit_events')
        .where('action', 'notification_outbox.discarded')
        .where('entity_id', poison.id)
        .first()
    )
  })

  test('rolls back terminal disposition when its critical audit evidence cannot be written', async ({
    assert,
    cleanup,
  }) => {
    const operator = await UserFactory.create({
      username: 'notification_dlq_atomic_audit_operator',
    })
    const poison = await seedDeadLetter(operator.id, 'invalid_contract')
    const originalWrite = auditPublicApi.write.bind(auditPublicApi)

    auditPublicApi.write = () =>
      Promise.reject(new TypeError('simulated critical audit persistence failure'))
    cleanup(() => {
      auditPublicApi.write = originalWrite
    })

    await assert.rejects(
      () =>
        makeDiscardNotificationOutboxDeadLettersCommand().execute(
          {
            ids: [poison.id],
            reason: 'Source contract is irreparable and disposition must remain atomic',
            confirmation: 'DISCARD',
            now: operationTime,
          },
          makeSystemAuditActionContext(operator.id)
        ),
      TypeError
    )

    const persisted = (await db.from('notification_outbox').where('id', poison.id).first()) as
      | {
          status: string
          disposed_at: Date | null
          disposed_by: string | null
          disposition_reason: string | null
        }
      | undefined
    assert.equal(persisted?.status, 'dead_letter')
    assert.isNull(persisted?.disposed_at)
    assert.isNull(persisted?.disposed_by)
    assert.isNull(persisted?.disposition_reason)
  })
})
