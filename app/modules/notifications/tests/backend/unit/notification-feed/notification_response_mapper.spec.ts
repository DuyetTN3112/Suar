import { test } from '@japa/runner'

import { mapNotificationResponse } from '#modules/notifications/controllers/mappers/response/notification-feed/notification_response_mapper'

test.group('Unit | Notification response mapper', () => {
  test('uses createdAt as the deterministic updatedAt fallback', ({ assert }) => {
    const serialized = mapNotificationResponse({
      id: '11111111-1111-4111-8111-111111111111',
      user_id: '22222222-2222-4222-8222-222222222222',
      title: 'Title',
      message: 'Body',
      is_read: false,
      type: 'info',
      related_entity_type: null,
      related_entity_id: null,
      created_at: '2026-07-23T00:00:00.000Z',
      updated_at: null,
    })

    assert.equal(serialized.created_at, '2026-07-23T00:00:00.000Z')
    assert.equal(serialized.updated_at, '2026-07-23T00:00:00.000Z')
  })
})
