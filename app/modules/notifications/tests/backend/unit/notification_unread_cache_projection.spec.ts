import { test } from '@japa/runner'

import { NotificationPermanentDeliveryError } from '#modules/notifications/domain/notification_outbox_errors'
import {
  buildNotificationUnreadCacheKey,
  NotificationUnreadCacheProjection,
  type NotificationUnreadRedis,
} from '#modules/notifications/infra/cache/notification_unread_cache_projection'

test.group('Unit | Notification Unread Cache Projection', () => {
  test('uses a Redis Cluster-safe key and absolute revisioned CAS payload', async ({ assert }) => {
    const calls: unknown[][] = []
    const redis: NotificationUnreadRedis = {
      eval: (...args) => {
        calls.push(args)
        return Promise.resolve(1)
      },
    }
    const projection = new NotificationUnreadCacheProjection(redis)
    const recipientId = '11111111-1111-4111-8111-111111111111'

    const applied = await projection.apply({
      recipientId,
      count: 12,
      revision: 431,
    })

    assert.isTrue(applied)
    assert.equal(
      buildNotificationUnreadCacheKey(recipientId),
      'notifications:v1:recipient:{11111111-1111-4111-8111-111111111111}:unread'
    )
    assert.equal(calls[0]?.[1], 1)
    assert.equal(
      calls[0]?.[2],
      'notifications:v1:recipient:{11111111-1111-4111-8111-111111111111}:unread'
    )
    assert.equal(calls[0]?.[3], '12')
    assert.equal(calls[0]?.[4], '431')
    assert.equal(calls[0]?.[5], '300')
  })

  test('reports stale/equal revisions as safely ignored', async ({ assert }) => {
    const redis: NotificationUnreadRedis = {
      eval: () => Promise.resolve(0),
    }
    const projection = new NotificationUnreadCacheProjection(redis)

    assert.isFalse(
      await projection.apply({
        recipientId: '11111111-1111-4111-8111-111111111111',
        count: 3,
        revision: 7,
      })
    )
  })

  test('rejects invalid payloads before touching Redis', async ({ assert }) => {
    let called = false
    const redis: NotificationUnreadRedis = {
      eval: () => {
        called = true
        return Promise.resolve(1)
      },
    }
    const projection = new NotificationUnreadCacheProjection(redis)

    await assert.rejects(
      () =>
        projection.apply({
          recipientId: 'not-a-uuid',
          count: -1,
          revision: 0,
        }),
      NotificationPermanentDeliveryError
    )
    assert.isFalse(called)
  })

  test('stores a revision-zero negative cache for an empty recipient', async ({ assert }) => {
    const redis: NotificationUnreadRedis = {
      eval: () => Promise.resolve(1),
    }
    const projection = new NotificationUnreadCacheProjection(redis)

    assert.isTrue(
      await projection.apply({
        recipientId: '11111111-1111-4111-8111-111111111111',
        count: 0,
        revision: 0,
      })
    )
  })
})
