import Redis from '@adonisjs/redis/services/main'
import { test } from '@japa/runner'

import { notificationApplication as notificationPublicApi } from '#composition/notifications/notification-feed/notification_composition'
import {
  NOTIFICATION_FEED_FALLBACK_ADMISSION_KEY,
  RedisNotificationFeedFallbackAdmissionController,
} from '#modules/notifications/infra/adapters/notification-feed/notification_feed_fallback_admission'
import { PostgresNotificationCanonicalFeedReader } from '#modules/notifications/infra/repositories/notification-feed/postgres_notification_canonical_feed_reader'
import { ResilientNotificationFeedReader } from '#modules/notifications/infra/adapters/notification-feed/resilient_notification_feed_reader'
import { NotificationFeedCursorCodec } from '#modules/notifications/infra/adapters/notification-feed/notification_feed_cursor_codec'
import { BACKEND_NOTIFICATION_TYPES } from '#modules/notifications/public_contracts/notification_constants'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, UserFactory } from '#tests/helpers/factories'

const RUN_REAL_REDIS = process.env['CACHE_INTEGRATION_DRIVER'] === 'redis'
const SKIP_REASON =
  'Set CACHE_INTEGRATION_DRIVER=redis to run against the configured cache connection'

test.group('Integration | Notification fallback admission Redis', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('enforces and releases the global lease budget', async ({ assert, cleanup }) => {
    const redis = Redis.connection('main')
    cleanup(async () => {
      await redis.del(NOTIFICATION_FEED_FALLBACK_ADMISSION_KEY)
    })
    for (let attempt = 0; attempt < 100 && redis.status !== 'ready'; attempt += 1) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 20)
      })
    }
    assert.equal(redis.status, 'ready')
    await redis.del(NOTIFICATION_FEED_FALLBACK_ADMISSION_KEY)

    const controller = new RedisNotificationFeedFallbackAdmissionController({
      redis,
      maxConcurrent: 1,
      leaseMs: 10_000,
    })

    const first = await controller.acquire()
    assert.isNotNull(first)
    assert.isNull(await controller.acquire())

    await first?.release()
    const afterRelease = await controller.acquire()
    assert.isNotNull(afterRelease)
    await afterRelease?.release()
  }).skip(!RUN_REAL_REDIS, SKIP_REASON)

  test('admits a real PostgreSQL fallback without running the exact-total contract', async ({
    assert,
    cleanup,
  }) => {
    const redis = Redis.connection('main')
    cleanup(async () => {
      await redis.del(NOTIFICATION_FEED_FALLBACK_ADMISSION_KEY)
    })
    for (let attempt = 0; attempt < 100 && redis.status !== 'ready'; attempt += 1) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 20)
      })
    }
    assert.equal(redis.status, 'ready')
    await redis.del(NOTIFICATION_FEED_FALLBACK_ADMISSION_KEY)
    const user = await UserFactory.create({ username: 'notification_fallback_integration' })
    const created = await notificationPublicApi.handle({
      user_id: user.id,
      title: 'Fallback integration',
      message: 'Canonical PostgreSQL remains available',
      type: BACKEND_NOTIFICATION_TYPES.ORGANIZATION,
    })
    assert.isNotNull(created)

    const cursorCodec = new NotificationFeedCursorCodec({
      secret: 'notification-fallback-integration-secret-32-bytes',
    })
    const service = new ResilientNotificationFeedReader({
      mode: 'elasticsearch',
      fallbackAdmission: new RedisNotificationFeedFallbackAdmissionController({
        redis,
        maxConcurrent: 1,
        leaseMs: 10_000,
      }),
      canonical: new PostgresNotificationCanonicalFeedReader(cursorCodec),
      search: {
        findByRecipient: () => Promise.reject(new Error('forced Elasticsearch outage')),
      },
      circuitFailureThreshold: 1,
    })

    const result = await service.read({
      recipientId: user.id,
      page: 1,
      limit: 20,
      unreadOnly: false,
      after: null,
      before: null,
    })

    assert.equal(result.source, 'postgres_fallback')
    assert.isNull(result.total)
    assert.deepEqual(
      result.data.map((notification) => notification.id),
      [created?.id]
    )
  }).skip(!RUN_REAL_REDIS, SKIP_REASON)

  test('renews a live owner so the global budget cannot expire under a long fallback read', async ({
    assert,
    cleanup,
  }) => {
    const redis = Redis.connection('main')
    cleanup(async () => {
      await redis.del(NOTIFICATION_FEED_FALLBACK_ADMISSION_KEY)
    })
    await redis.del(NOTIFICATION_FEED_FALLBACK_ADMISSION_KEY)
    const controller = new RedisNotificationFeedFallbackAdmissionController({
      redis,
      maxConcurrent: 1,
      leaseMs: 1_000,
    })

    const liveLease = await controller.acquire()
    assert.isNotNull(liveLease)
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 1_300)
    })
    assert.isNull(await controller.acquire())

    await liveLease?.release()
    const afterRelease = await controller.acquire()
    assert.isNotNull(afterRelease)
    await afterRelease?.release()
  }).skip(!RUN_REAL_REDIS, SKIP_REASON)
})
