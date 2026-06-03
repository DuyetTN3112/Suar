import { test } from '@japa/runner'

import { NodeNotificationEventIdentityProvider } from '#modules/notifications/infra/adapters/notification-outbox/node_notification_event_identity_provider'
import {
  buildNotificationEventId,
  registerNotificationEventIdentityProvider,
} from '#modules/notifications/public_contracts/notification_event_identity'

registerNotificationEventIdentityProvider(new NodeNotificationEventIdentityProvider())

test.group('Unit | Notification Event Identity', () => {
  test('derives a stable UUIDv5 from domain event and recipient identity', ({ assert }) => {
    const first = buildNotificationEventId({
      eventName: 'organization.created',
      businessEventId: '019c1234-1111-7111-8111-111111111111',
      recipientId: '019c1234-2222-7222-8222-222222222222',
    })
    const retry = buildNotificationEventId({
      eventName: 'organization.created',
      businessEventId: '019c1234-1111-7111-8111-111111111111',
      recipientId: '019c1234-2222-7222-8222-222222222222',
    })

    assert.equal(retry, first)
    assert.match(first, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  test('separates event type, business occurrence, and recipient', ({ assert }) => {
    const base = {
      eventName: 'organization.created',
      businessEventId: 'organization-1',
      recipientId: 'recipient-1',
    }

    assert.notEqual(
      buildNotificationEventId(base),
      buildNotificationEventId({ ...base, eventName: 'organization.deleted' })
    )
    assert.notEqual(
      buildNotificationEventId(base),
      buildNotificationEventId({ ...base, businessEventId: 'organization-2' })
    )
    assert.notEqual(
      buildNotificationEventId(base),
      buildNotificationEventId({ ...base, recipientId: 'recipient-2' })
    )
  })
})
