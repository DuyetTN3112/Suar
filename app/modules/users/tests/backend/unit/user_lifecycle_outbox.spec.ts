import { test } from '@japa/runner'

import { DomainEventUserLifecycleEventStagerAdapter } from '#composition/adapters/domain_event_user_lifecycle_event_stager_adapter'
import type { StageDomainEventInput } from '#modules/events/public_contracts/domain_event_outbox'

test.group('User lifecycle durable outbox staging', () => {
  test('stages account lifecycle on the caller transaction', async ({
    assert,
  }) => {
    const transaction: object = {}
    const staged: StageDomainEventInput[] = []
    const stager = new DomainEventUserLifecycleEventStagerAdapter((trx, event) => {
      assert.strictEqual(trx, transaction)
      staged.push(event)
      return Promise.resolve({ id: 'outbox-1', staged: true })
    })
    await stager.stageAccountLifecycle(transaction, {
      mutationId: 'mutation-account-1',
      action: 'deleted',
      userId: 'user-1',
      actorId: 'admin-1',
      occurredAt: '2026-07-26T10:00:00.000Z',
    })

    const event = staged[0]
    if (!event || event.eventName !== 'user:account:lifecycle:changed:v1') {
      assert.fail('Expected durable user account lifecycle event')
      return
    }
    assert.equal(event.aggregateType, 'user')
    assert.equal(event.dedupeKey, event.payload.eventId)
  })

  test('canonicalizes field names without persisting field values', async ({
    assert,
  }) => {
    const transaction: object = {}
    const staged: StageDomainEventInput[] = []
    const stager = new DomainEventUserLifecycleEventStagerAdapter((_trx, event) => {
      staged.push(event)
      return Promise.resolve({ id: 'outbox-2', staged: true })
    })
    await stager.stageProfileChanged(transaction, {
      mutationId: 'mutation-profile-1',
      userId: 'user-1',
      actorId: 'user-1',
      changedFields: ['email', 'bio', 'email'],
      occurredAt: '2026-07-26T10:01:00.000Z',
    })

    const event = staged[0]
    if (!event || event.eventName !== 'user:profile:changed:v1') {
      assert.fail('Expected durable user profile event')
      return
    }
    assert.deepEqual(event.payload.changedFields, ['bio', 'email'])
    assert.notProperty(event.payload, 'changes')
  })
})
