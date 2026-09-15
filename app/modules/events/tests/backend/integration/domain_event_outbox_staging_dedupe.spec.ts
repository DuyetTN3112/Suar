import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import { stageDomainEvent } from '#modules/events/public_contracts/domain_event_outbox'
import {
  cleanOutbox,
  eventInput,
  type OutboxPayloadRow,
  setupOutboxTestGroup,
  teardownOutboxTestGroup,
} from '#modules/events/tests/backend/support/domain_event_outbox_test_support'

test.group('Domain event outbox - Staging and Deduplication', (group) => {
  group.setup(() => setupOutboxTestGroup())
  group.each.teardown(() => cleanOutbox())
  group.teardown(() => teardownOutboxTestGroup())

  test('rolls staged events back with the caller-owned business transaction', async ({
    assert,
  }) => {
    const input = eventInput()
    const trx = await db.transaction()

    const staged = await stageDomainEvent(trx, input)
    assert.isTrue(staged.staged)
    await trx.rollback()

    const row = (await db
      .from('domain_event_outbox')
      .where('event_name', input.eventName)
      .where('dedupe_key', input.dedupeKey)
      .first()) as unknown
    assert.isNull(row)
  })

  test('stages an identical dedupe key exactly once', async ({ assert }) => {
    const input = eventInput()
    let firstId = ''
    let secondId = ''

    await db.transaction(async (trx) => {
      const first = await stageDomainEvent(trx, input)
      const second = await stageDomainEvent(trx, input)
      firstId = first.id
      secondId = second.id
      assert.isTrue(first.staged)
      assert.isFalse(second.staged)
    })

    assert.equal(secondId, firstId)
    const rows = await db
      .from('domain_event_outbox')
      .where('event_name', input.eventName)
      .where('dedupe_key', input.dedupeKey)
    assert.lengthOf(rows, 1)
  })

  test('fails closed when a dedupe key is reused for different event data', async ({
    assert,
  }) => {
    const original = eventInput()
    const conflicting = eventInput({
      dedupeKey: original.dedupeKey,
      assignmentId: original.aggregateId,
      assigneeId: randomUUID(),
    })

    await db.transaction((trx) => stageDomainEvent(trx, original))
    await assert.rejects(
      () => db.transaction((trx) => stageDomainEvent(trx, conflicting)),
      InvariantViolationException
    )

    const rows = (await db
      .from('domain_event_outbox')
      .where('event_name', original.eventName)
      .where('dedupe_key', original.dedupeKey)) as unknown as OutboxPayloadRow[]
    assert.lengthOf(rows, 1)
    assert.deepEqual(rows[0]?.payload, original.payload)
  })
})
