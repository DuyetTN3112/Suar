import { randomUUID } from 'node:crypto'

import Redis from '@adonisjs/redis/services/main'
import { test } from '@japa/runner'

import { cacheRedisCommandStore } from '#modules/cache/public_contracts/cache_store'
import { CachedNotificationUnreadCountReader } from '#modules/notifications/infra/cache/cached_notification_unread_count_reader'
import {
  buildNotificationUnreadCacheKey,
  NotificationUnreadCacheProjection,
} from '#modules/notifications/infra/cache/notification_unread_cache_projection'
import { RedisNotificationUnreadCacheReader } from '#modules/notifications/infra/cache/notification_unread_cache_reader'

const RUN_REAL_REDIS = process.env['CACHE_INTEGRATION_DRIVER'] === 'redis'
const SKIP_REASON =
  'Set CACHE_INTEGRATION_DRIVER=redis to run unread projection tests on the configured cache Redis'
const SET_RAW_VALUE_SCRIPT = `
redis.call('SET', KEYS[1], ARGV[1], 'EX', tonumber(ARGV[2]))
return 1
`
const DELETE_KEY_SCRIPT = `return redis.call('DEL', KEYS[1])`

test.group('Integration | Notification unread cache Redis', () => {
  test('publishes through the cache command port on the first cache command', async ({
    assert,
  }) => {
    const subscribers = await cacheRedisCommandStore.publish(
      `notifications:test:${randomUUID()}`,
      JSON.stringify({ type: 'notification.count.changed', revision: 1 })
    )

    assert.isAtLeast(subscribers, 0)
  }).skip(!RUN_REAL_REDIS, SKIP_REASON)

  test('uses only the cache plane and enforces revisioned CAS with a physical TTL', async ({
    assert,
    cleanup,
  }) => {
    const recipientId = randomUUID()
    const key = buildNotificationUnreadCacheKey(recipientId)
    const cacheRedis = Redis.connection('cache')
    const mainRedis = Redis.connection('main')
    cleanup(async () => {
      await Promise.all([
        cacheRedisCommandStore.eval(DELETE_KEY_SCRIPT, 1, key),
        mainRedis.del(key),
      ])
    })
    const projection = new NotificationUnreadCacheProjection(cacheRedisCommandStore, 60)
    const reader = new RedisNotificationUnreadCacheReader()

    assert.isTrue(await projection.apply({ recipientId, count: 7, revision: 11 }))
    const firstRaw = await cacheRedis.get(key)
    assert.deepEqual(JSON.parse(firstRaw ?? ''), { count: 7, revision: 11 })
    assert.equal(await reader.get(recipientId), firstRaw)
    assert.isNull(await mainRedis.get(key))
    assert.isAtLeast(await cacheRedis.ttl(key), 1)
    assert.isAtMost(await cacheRedis.ttl(key), 60)

    assert.isFalse(await projection.apply({ recipientId, count: 99, revision: 11 }))
    assert.deepEqual(JSON.parse((await cacheRedis.get(key)) ?? ''), {
      count: 7,
      revision: 11,
    })

    assert.isTrue(await projection.apply({ recipientId, count: 8, revision: 12 }))
    assert.deepEqual(JSON.parse((await cacheRedis.get(key)) ?? ''), {
      count: 8,
      revision: 12,
    })
  }).skip(!RUN_REAL_REDIS, SKIP_REASON)

  test('atomically replaces corrupt and oversized legacy payloads', async ({ assert, cleanup }) => {
    const recipientId = randomUUID()
    const key = buildNotificationUnreadCacheKey(recipientId)
    const cacheRedis = Redis.connection('cache')
    cleanup(async () => {
      await cacheRedisCommandStore.eval(DELETE_KEY_SCRIPT, 1, key)
    })
    const projection = new NotificationUnreadCacheProjection(cacheRedisCommandStore, 60)

    await cacheRedisCommandStore.eval(SET_RAW_VALUE_SCRIPT, 1, key, '{malformed-json', '60')
    assert.isTrue(await projection.apply({ recipientId, count: 3, revision: 20 }))
    assert.deepEqual(JSON.parse((await cacheRedis.get(key)) ?? ''), {
      count: 3,
      revision: 20,
    })

    await cacheRedisCommandStore.eval(SET_RAW_VALUE_SCRIPT, 1, key, 'x'.repeat(513), '60')
    assert.isTrue(await projection.apply({ recipientId, count: 4, revision: 21 }))
    assert.deepEqual(JSON.parse((await cacheRedis.get(key)) ?? ''), {
      count: 4,
      revision: 21,
    })
  }).skip(!RUN_REAL_REDIS, SKIP_REASON)

  test('rebuilds from canonical state once and serves the next read from real Redis', async ({
    assert,
    cleanup,
  }) => {
    const recipientId = randomUUID()
    const key = buildNotificationUnreadCacheKey(recipientId)
    cleanup(async () => {
      await cacheRedisCommandStore.eval(DELETE_KEY_SCRIPT, 1, key)
    })
    let canonicalReads = 0
    const service = new CachedNotificationUnreadCountReader({
      cache: new RedisNotificationUnreadCacheReader(),
      canonical: {
        read: () => {
          canonicalReads++
          return Promise.resolve({ count: 5, revision: 31 })
        },
      },
      cacheWriter: new NotificationUnreadCacheProjection(cacheRedisCommandStore, 60),
    })

    assert.deepEqual(await service.get(recipientId), {
      count: 5,
      revision: 31,
      source: 'postgres',
    })
    assert.deepEqual(await service.get(recipientId), {
      count: 5,
      revision: 31,
      source: 'redis',
    })
    assert.equal(canonicalReads, 1)
  }).skip(!RUN_REAL_REDIS, SKIP_REASON)
})
